// app/api/grants/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  // Parse query params
  const page = parseInt(searchParams.get('page') || '1');
  const perPage = parseInt(searchParams.get('per_page') || '20');
  const search = searchParams.get('search') || '';
  const sectors = searchParams.getAll('sector');
  const stages = searchParams.getAll('stage');
  const providerTypes = searchParams.getAll('provider_type');
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const sortOrder = searchParams.get('sort_order') || 'desc';

  // Build query
  let query = supabase
    .from('grants')
    .select('*', { count: 'exact' })
    .eq('is_active', true);

  // Apply search filter
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,provider.ilike.%${search}%`);
  }

  // Apply sector filter (grants where sectors array overlaps with requested sectors)
  if (sectors.length > 0) {
    query = query.overlaps('sectors', sectors);
  }

  // Apply stage filter
  if (stages.length > 0) {
    query = query.overlaps('stages', stages);
  }

  // Apply provider type filter
  if (providerTypes.length > 0) {
    query = query.in('provider_type', providerTypes);
  }

  // Apply sorting
  const ascending = sortOrder === 'asc';
  query = query.order(sortBy, { ascending, nullsFirst: false });

  // Apply pagination
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    total: count || 0,
    page,
    per_page: perPage,
    total_pages: Math.ceil((count || 0) / perPage),
  });
}
