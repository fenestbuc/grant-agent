// app/api/grants/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sanitizeSearchInput } from '@/lib/utils/sanitize';

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
  const statuses = searchParams.getAll('status');
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const sortOrder = searchParams.get('sort_order') || 'desc';

  // Build query
  let query = supabase
    .from('grants')
    .select('*', { count: 'exact' });

  // If no status filter includes 'closed', default to only active grants
  if (statuses.length === 0) {
    query = query.eq('is_active', true);
  }

  // Apply search filter
  if (search) {
    const sanitized = sanitizeSearchInput(search);
    if (sanitized) {
      query = query.or(`name.ilike.%${sanitized}%,description.ilike.%${sanitized}%,provider.ilike.%${sanitized}%`);
    }
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

  // Apply status filter using deadline-based SQL logic
  if (statuses.length > 0) {
    const now = new Date().toISOString();
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const orConditions: string[] = [];

    for (const status of statuses) {
      switch (status) {
        case 'open':
          // deadline > now + 7 days AND is_active = true
          orConditions.push(`and(deadline.gt.${sevenDaysFromNow},is_active.eq.true)`);
          break;
        case 'closing_soon':
          // deadline between now and now + 7 days AND is_active = true
          orConditions.push(`and(deadline.gte.${now},deadline.lte.${sevenDaysFromNow},is_active.eq.true)`);
          break;
        case 'closed':
          // deadline < now OR is_active = false
          orConditions.push(`deadline.lt.${now}`);
          orConditions.push('is_active.eq.false');
          break;
        case 'rolling':
          // deadline IS NULL AND is_active = true
          orConditions.push('and(deadline.is.null,is_active.eq.true)');
          break;
      }
    }

    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','));
    }
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
