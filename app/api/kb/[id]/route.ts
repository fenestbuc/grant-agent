// app/api/kb/[id]/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  // Delete from storage
  await supabase.storage.from('kb-documents').remove([document.storage_path]);

  // Delete from database (cascades to kb_chunks)
  const { error: deleteError } = await supabase
    .from('kb_documents')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
