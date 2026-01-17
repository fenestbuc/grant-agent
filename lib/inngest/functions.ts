import { inngest } from './client';
import { createAdminClient } from '@/lib/supabase/server';
import { extractTextFromFile, extractMetadata, chunkText, generateEmbeddings } from '@/lib/llm/document-processor';

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
  { cron: '0 9 * * *' }, // Run daily at 9 AM
  async ({ step }) => {
    const supabase = createAdminClient();

    // Get grants with upcoming deadlines (7, 3, 1 day)
    const upcomingGrants = await step.run('get-upcoming-grants', async () => {
      const today = new Date();
      const in7Days = new Date(today);
      in7Days.setDate(today.getDate() + 7);

      const { data, error } = await supabase
        .from('grants')
        .select('id, name, deadline')
        .gte('deadline', today.toISOString())
        .lte('deadline', in7Days.toISOString())
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    });

    // Get users watching these grants
    for (const grant of upcomingGrants) {
      await step.run(`notify-watchers-${grant.id}`, async () => {
        const { data: watchers, error } = await supabase
          .from('watchlist')
          .select('startup_id, startups(user_id)')
          .eq('grant_id', grant.id)
          .eq('notify_deadline', true);

        if (error || !watchers) return;

        const deadline = new Date(grant.deadline);
        const today = new Date();
        const daysUntil = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Create notifications
        const notifications = watchers.map((w) => ({
          startup_id: w.startup_id,
          type: 'deadline_reminder',
          title: `${grant.name} deadline in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
          message: `The application deadline for ${grant.name} is ${deadline.toLocaleDateString()}.`,
          grant_id: grant.id,
          is_read: false,
        }));

        await supabase.from('notifications').insert(notifications);
      });
    }

    return { grantsProcessed: upcomingGrants.length };
  }
);

// Export all functions
export const functions = [processDocument, sendDeadlineReminders];
