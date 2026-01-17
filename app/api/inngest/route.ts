import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { functions } from '@/lib/inngest/functions';

// Serve the Inngest API for background job processing
// Development: Run `npx inngest-cli@latest dev` to see the dashboard
// Production: Inngest will call this endpoint via webhook
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
