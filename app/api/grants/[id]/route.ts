import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiError, apiSuccess } from '@/lib/api/response';

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
    return apiError('Grant not found', 404);
  }

  return apiSuccess(grant);
}
