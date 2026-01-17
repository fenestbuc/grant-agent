import { inngest } from './client';
import { createAdminClient } from '@/lib/supabase/server';
import { extractTextFromFile, extractMetadata, chunkText, generateEmbeddings } from '@/lib/llm/document-processor';
import { Resend } from 'resend';

// Document processing workflow
export const processDocument = inngest.createFunction(
  { id: 'process-document', retries: 2 },
  { event: 'kb/document.uploaded' },
  async ({ event, step }) => {
    const { documentId, startupId, storagePath, fileType } = event.data;
    const supabase = createAdminClient();

    // Step 1: Update status to processing
    await step.run('update-status-processing', async () => {
      await supabase
        .from('kb_documents')
        .update({ status: 'processing' })
        .eq('id', documentId);
    });

    // Step 2: Download file from storage and extract text
    const extractedText = await step.run('download-and-extract', async () => {
      const { data, error } = await supabase.storage
        .from('kb-documents')
        .download(storagePath);

      if (error) throw new Error(`Failed to download file: ${error.message}`);
      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return await extractTextFromFile(buffer, fileType);
    });

    // Step 4: Extract metadata using Claude
    const metadata = await step.run('extract-metadata', async () => {
      return await extractMetadata(extractedText);
    });

    // Step 5: Chunk the text
    const chunks = await step.run('chunk-text', async () => {
      return chunkText(extractedText, 500, 50);
    });

    // Step 6: Generate embeddings for each chunk
    const chunksWithEmbeddings = await step.run('generate-embeddings', async () => {
      return await generateEmbeddings(chunks);
    });

    // Step 7: Store chunks in database
    await step.run('store-chunks', async () => {
      const chunkRecords = chunksWithEmbeddings.map((chunk, index) => ({
        document_id: documentId,
        startup_id: startupId,
        content: chunk.content,
        chunk_index: index,
        embedding: chunk.embedding,
      }));

      const { error } = await supabase.from('kb_chunks').insert(chunkRecords);
      if (error) throw new Error(`Failed to store chunks: ${error.message}`);
    });

    // Step 8: Update document with metadata and completed status
    await step.run('update-document-completed', async () => {
      await supabase
        .from('kb_documents')
        .update({
          status: 'completed',
          extracted_metadata: metadata,
        })
        .eq('id', documentId);
    });

    return { success: true, chunksProcessed: chunks.length };
  }
);

// Deadline reminder job
export const sendDeadlineReminders = inngest.createFunction(
  { id: 'send-deadline-reminders' },
  { cron: '0 3 * * *' }, // Run daily at 3 AM UTC (~9 AM IST)
  async ({ step }) => {
    const supabase = createAdminClient();
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'grants@grantagent.com';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Get dates for 7 days and 1 day from now
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);
    const in7DaysEnd = new Date(in7Days);
    in7DaysEnd.setHours(23, 59, 59, 999);

    const in1Day = new Date(today);
    in1Day.setDate(today.getDate() + 1);
    const in1DayEnd = new Date(in1Day);
    in1DayEnd.setHours(23, 59, 59, 999);

    // Get grants with deadlines in exactly 7 days
    const grants7Days = await step.run('get-grants-7-days', async () => {
      const { data, error } = await supabase
        .from('grants')
        .select('id, name, deadline, url')
        .gte('deadline', in7Days.toISOString())
        .lte('deadline', in7DaysEnd.toISOString())
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    });

    // Get grants with deadlines in exactly 1 day
    const grants1Day = await step.run('get-grants-1-day', async () => {
      const { data, error } = await supabase
        .from('grants')
        .select('id, name, deadline, url')
        .gte('deadline', in1Day.toISOString())
        .lte('deadline', in1DayEnd.toISOString())
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    });

    // Combine grants with their days-until info
    const grantsToNotify = [
      ...grants7Days.map(g => ({ ...g, daysUntil: 7 })),
      ...grants1Day.map(g => ({ ...g, daysUntil: 1 })),
    ];

    let notificationsSent = 0;
    let emailsSent = 0;

    // Process each grant
    for (const grant of grantsToNotify) {
      await step.run(`notify-watchers-${grant.id}-${grant.daysUntil}d`, async () => {
        // Get watchlist entries with notify_deadline enabled, including startup and user info
        const { data: watchers, error } = await supabase
          .from('watchlist')
          .select('startup_id, startups(id, user_id, name)')
          .eq('grant_id', grant.id)
          .eq('notify_deadline', true);

        if (error || !watchers || watchers.length === 0) return;

        const deadline = new Date(grant.deadline!);
        const formattedDeadline = deadline.toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        // Process each watcher
        for (const watcher of watchers) {
          // Supabase returns single object for to-one relationship, but TypeScript sees array
          const startup = watcher.startups as unknown as { id: string; user_id: string; name: string } | null;
          if (!startup) continue;

          // Create in-app notification
          const notificationTitle = grant.daysUntil === 1
            ? `Urgent: ${grant.name} deadline tomorrow!`
            : `${grant.name} deadline in ${grant.daysUntil} days`;

          const notificationMessage = `The application deadline for ${grant.name} is ${formattedDeadline}. Don't miss this opportunity!`;

          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              startup_id: watcher.startup_id,
              type: 'deadline_reminder',
              title: notificationTitle,
              message: notificationMessage,
              grant_id: grant.id,
              is_read: false,
            });

          if (!notifError) notificationsSent++;

          // Get user email via admin API
          const { data: userData, error: userError } = await supabase.auth.admin.getUserById(startup.user_id);

          if (userError || !userData.user?.email) continue;

          // Send email notification
          try {
            const urgencyText = grant.daysUntil === 1 ? 'URGENT: ' : '';
            await resend.emails.send({
              from: fromEmail,
              to: userData.user.email,
              subject: `${urgencyText}${grant.name} - Deadline in ${grant.daysUntil} day${grant.daysUntil > 1 ? 's' : ''}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: ${grant.daysUntil === 1 ? '#dc2626' : '#2563eb'};">
                    ${grant.daysUntil === 1 ? '🚨 Urgent Deadline Reminder' : '📅 Deadline Reminder'}
                  </h2>
                  <p>Hi${startup.name ? ` ${startup.name} team` : ''},</p>
                  <p>
                    ${grant.daysUntil === 1
                      ? `<strong>Tomorrow is the last day</strong> to apply for <strong>${grant.name}</strong>!`
                      : `The deadline for <strong>${grant.name}</strong> is in <strong>${grant.daysUntil} days</strong>.`}
                  </p>
                  <p><strong>Deadline:</strong> ${formattedDeadline}</p>
                  <div style="margin: 24px 0;">
                    <a href="${appUrl}/grants/${grant.id}"
                       style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                      View Grant & Apply
                    </a>
                  </div>
                  <p style="color: #6b7280; font-size: 14px;">
                    You're receiving this because you added this grant to your watchlist with deadline reminders enabled.
                  </p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                  <p style="color: #9ca3af; font-size: 12px;">
                    Grants India - Helping founders discover and apply for grants
                  </p>
                </div>
              `,
            });
            emailsSent++;
          } catch (emailError) {
            console.error(`Failed to send email to ${userData.user.email}:`, emailError);
          }
        }
      });
    }

    return {
      grantsProcessed: grantsToNotify.length,
      notificationsSent,
      emailsSent,
    };
  }
);

// Weekly digest job - sends summary of new grants and upcoming deadlines
export const sendWeeklyDigest = inngest.createFunction(
  { id: 'send-weekly-digest' },
  { cron: '0 3 * * 1' }, // Run every Monday at 3 AM UTC (~9 AM IST)
  async ({ step }) => {
    const supabase = createAdminClient();
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'grants@grantagent.com';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Calculate date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);

    const in14Days = new Date(today);
    in14Days.setDate(today.getDate() + 14);

    // Get all startups
    const startups = await step.run('get-startups', async () => {
      const { data, error } = await supabase
        .from('startups')
        .select('id, user_id, name, sector, stage');

      if (error) throw error;
      return data || [];
    });

    // Get all new grants from the last week
    const newGrants = await step.run('get-new-grants', async () => {
      const { data, error } = await supabase
        .from('grants')
        .select('id, name, description, sectors, stages, deadline, url, amount_min, amount_max, currency')
        .gte('created_at', oneWeekAgo.toISOString())
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    });

    let digestsSent = 0;

    // Process each startup
    for (const startup of startups) {
      await step.run(`process-startup-${startup.id}`, async () => {
        // Find new grants matching this startup's sector/stage
        const matchingNewGrants = newGrants.filter(grant => {
          const sectorMatch = grant.sectors.length === 0 ||
            grant.sectors.some((s: string) => s.toLowerCase() === startup.sector?.toLowerCase());
          const stageMatch = grant.stages.length === 0 ||
            grant.stages.includes(startup.stage);
          return sectorMatch || stageMatch;
        });

        // Find watchlisted grants with deadlines in next 14 days
        const { data: watchlistedGrants, error: watchlistError } = await supabase
          .from('watchlist')
          .select(`
            grant_id,
            grants (
              id,
              name,
              deadline,
              url
            )
          `)
          .eq('startup_id', startup.id);

        if (watchlistError) {
          console.error(`Failed to get watchlist for startup ${startup.id}:`, watchlistError);
          return;
        }

        // Filter for grants with upcoming deadlines
        const upcomingDeadlineGrants = (watchlistedGrants || [])
          .map(w => w.grants as unknown as { id: string; name: string; deadline: string | null; url: string } | null)
          .filter((grant): grant is { id: string; name: string; deadline: string; url: string } => {
            if (!grant || !grant.deadline) return false;
            const deadlineDate = new Date(grant.deadline);
            return deadlineDate >= today && deadlineDate <= in14Days;
          })
          .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

        // Skip if nothing to report
        if (matchingNewGrants.length === 0 && upcomingDeadlineGrants.length === 0) {
          return;
        }

        // Get user email
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(startup.user_id);
        if (userError || !userData.user?.email) {
          console.error(`Failed to get user email for startup ${startup.id}`);
          return;
        }

        // Build email content
        let emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Weekly Grant Digest</h2>
            <p>Hi${startup.name ? ` ${startup.name} team` : ''},</p>
            <p>Here's your weekly summary of grant opportunities:</p>
        `;

        // New Grants Section
        if (matchingNewGrants.length > 0) {
          emailHtml += `
            <h3 style="color: #16a34a; margin-top: 24px;">New Grants This Week</h3>
            <p style="color: #6b7280; font-size: 14px;">
              ${matchingNewGrants.length} new grant${matchingNewGrants.length > 1 ? 's' : ''} matching your profile
            </p>
            <ul style="list-style: none; padding: 0;">
          `;

          for (const grant of matchingNewGrants.slice(0, 5)) {
            const amountText = grant.amount_min && grant.amount_max
              ? `${grant.currency} ${grant.amount_min.toLocaleString('en-IN')} - ${grant.amount_max.toLocaleString('en-IN')}`
              : grant.amount_min
                ? `Up to ${grant.currency} ${grant.amount_min.toLocaleString('en-IN')}`
                : '';

            emailHtml += `
              <li style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                <a href="${appUrl}/grants/${grant.id}" style="color: #2563eb; font-weight: 600; text-decoration: none; font-size: 16px;">
                  ${grant.name}
                </a>
                ${amountText ? `<p style="color: #059669; margin: 8px 0 4px 0; font-weight: 500;">${amountText}</p>` : ''}
                <p style="color: #6b7280; margin: 4px 0; font-size: 14px; line-height: 1.5;">
                  ${grant.description ? grant.description.substring(0, 150) + (grant.description.length > 150 ? '...' : '') : ''}
                </p>
              </li>
            `;
          }

          if (matchingNewGrants.length > 5) {
            emailHtml += `
              <p style="text-align: center;">
                <a href="${appUrl}/grants" style="color: #2563eb;">
                  View ${matchingNewGrants.length - 5} more new grants
                </a>
              </p>
            `;
          }

          emailHtml += `</ul>`;
        }

        // Upcoming Deadlines Section
        if (upcomingDeadlineGrants.length > 0) {
          emailHtml += `
            <h3 style="color: #dc2626; margin-top: 24px;">Upcoming Deadlines</h3>
            <p style="color: #6b7280; font-size: 14px;">
              ${upcomingDeadlineGrants.length} watchlisted grant${upcomingDeadlineGrants.length > 1 ? 's' : ''} with deadlines in the next 14 days
            </p>
            <ul style="list-style: none; padding: 0;">
          `;

          for (const grant of upcomingDeadlineGrants) {
            const deadline = new Date(grant.deadline);
            const daysUntil = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const formattedDeadline = deadline.toLocaleDateString('en-IN', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });

            const urgencyColor = daysUntil <= 3 ? '#dc2626' : daysUntil <= 7 ? '#f59e0b' : '#6b7280';

            emailHtml += `
              <li style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <a href="${appUrl}/grants/${grant.id}" style="color: #2563eb; font-weight: 600; text-decoration: none;">
                    ${grant.name}
                  </a>
                </div>
                <div style="text-align: right;">
                  <span style="color: ${urgencyColor}; font-weight: 600;">
                    ${daysUntil} day${daysUntil !== 1 ? 's' : ''} left
                  </span>
                  <br>
                  <span style="color: #9ca3af; font-size: 12px;">${formattedDeadline}</span>
                </div>
              </li>
            `;
          }

          emailHtml += `</ul>`;
        }

        // Footer
        emailHtml += `
            <div style="margin-top: 32px; text-align: center;">
              <a href="${appUrl}/grants"
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Explore All Grants
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              Grants India - Helping founders discover and apply for grants
            </p>
          </div>
        `;

        // Send the email
        try {
          const subjectParts = [];
          if (matchingNewGrants.length > 0) {
            subjectParts.push(`${matchingNewGrants.length} new grant${matchingNewGrants.length > 1 ? 's' : ''}`);
          }
          if (upcomingDeadlineGrants.length > 0) {
            subjectParts.push(`${upcomingDeadlineGrants.length} upcoming deadline${upcomingDeadlineGrants.length > 1 ? 's' : ''}`);
          }

          await resend.emails.send({
            from: fromEmail,
            to: userData.user.email,
            subject: `Weekly Digest: ${subjectParts.join(' & ')}`,
            html: emailHtml,
          });

          digestsSent++;
        } catch (emailError) {
          console.error(`Failed to send weekly digest to ${userData.user.email}:`, emailError);
        }
      });
    }

    return {
      startupsProcessed: startups.length,
      newGrantsFound: newGrants.length,
      digestsSent,
    };
  }
);

// Export all functions
export const functions = [processDocument, sendDeadlineReminders, sendWeeklyDigest];
