// app/api/kb/[id]/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// UUID v4 validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid document ID format' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: startup } = await supabase
      .from('startups')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!startup) {
      return NextResponse.json({ error: 'No startup profile found' }, { status: 400 });
    }

    // Verify ownership and get storage path
    const { data: document, error: fetchError } = await supabase
      .from('kb_documents')
      .select('storage_path')
      .eq('id', id)
      .eq('startup_id', startup.id)
      .single();

    if (fetchError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete from storage (log error but don't fail the request)
    const { error: storageError } = await supabase.storage
      .from('kb-documents')
      .remove([document.storage_path]);

    if (storageError) {
      console.error('Failed to delete file from storage:', storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database (cascades to kb_chunks)
    const { error: deleteError } = await supabase
      .from('kb_documents')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ data: { deleted: true, id } });
  } catch (error) {
    console.error('KB delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
