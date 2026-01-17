// app/api/kb/upload/route.ts
import { createClient } from '@/lib/supabase/server';
import { inngest } from '@/lib/inngest/client';
import { NextRequest, NextResponse } from 'next/server';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/csv'];

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get startup for this user
  const { data: startup } = await supabase
    .from('startups')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!startup) {
    return NextResponse.json({ error: 'No startup profile found' }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: PDF, DOCX, TXT, CSV' }, { status: 400 });
    }

    // Generate unique storage path
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${startup.id}/${timestamp}-${safeName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('kb-documents')
      .upload(storagePath, file);

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    // Determine file type for processing
    const fileType = file.type === 'application/pdf' ? 'pdf'
      : file.type.includes('wordprocessingml') ? 'docx'
      : file.type === 'text/csv' ? 'csv'
      : 'txt';

    // Create database record
    const { data: document, error: dbError } = await supabase
      .from('kb_documents')
      .insert({
        startup_id: startup.id,
        filename: file.name,
        file_type: fileType,
        file_size: file.size,
        storage_path: storagePath,
        status: 'pending',
      })
      .select()
      .single();

    if (dbError) {
      // Cleanup uploaded file
      await supabase.storage.from('kb-documents').remove([storagePath]);
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 });
    }

    // Trigger processing workflow
    await inngest.send({
      name: 'kb/document.uploaded',
      data: {
        documentId: document.id,
        startupId: startup.id,
        storagePath,
        fileType,
      },
    });

    return NextResponse.json({ data: document });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
