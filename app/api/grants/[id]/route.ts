import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: grant, error } = await supabase
    .from('grants')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !grant) {
    return NextResponse.json(
      { data: null, error: 'Grant not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: grant, error: null });
}
