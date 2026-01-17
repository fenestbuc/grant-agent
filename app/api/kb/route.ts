// app/api/kb/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
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

  const { data: documents, error } = await supabase
    .from('kb_documents')
    .select('*')
    .eq('startup_id', startup.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: documents });
}
