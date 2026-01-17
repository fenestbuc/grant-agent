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
                    Grant Agent - Helping founders discover and apply for grants
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

// Export all functions
export const functions = [processDocument, sendDeadlineReminders];
