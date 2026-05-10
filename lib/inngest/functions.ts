import { inngest } from './client';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key_for_build');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-key'
);

export const weeklyDigestEmail = inngest.createFunction(
  { id: 'weekly-digest-email' },
  { cron: '0 9 * * 1' }, // Monday 9 AM
  async ({ step }) => {
    const users = await step.run('fetch-users', async () => {
      const { data, error } = await supabase.from('startups').select('id, user_id, company_name');
      if (error) throw new Error(error.message);
      return data;
    });

    for (const user of users) {
      await step.run(`send-email-${user.id}`, async () => {
        // Fetch new grants
        const { data: newGrants } = await supabase
          .from('grants')
          .select('name')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(3);

        if (!newGrants || newGrants.length === 0) return { skipped: true };

        const html = `
          <h2>Weekly Grant Digest for ${user.company_name || 'Founder'}</h2>
          <p>Here are new grants matching your profile:</p>
          <ul>
            ${newGrants.map((g: { name: string }) => `<li>${g.name}</li>`).join('')}
          </ul>
          <p>Log in to view more and apply.</p>
        `;

        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'grants@kubar.tech',
            to: 'founder@example.com', // In reality, fetch user's email via auth
            subject: 'Your Weekly Grants Digest',
            html,
          });
        } catch (e) {
          console.error(e);
        }
      });
    }

    return { success: true, processed: users.length };
  }
);

export const deadlineReminder = inngest.createFunction(
  { id: 'deadline-reminder' },
  { cron: '0 9 * * *' }, // Daily 9 AM
  async () => {
    return { success: true, message: 'Deadline reminder stub' };
  }
);
