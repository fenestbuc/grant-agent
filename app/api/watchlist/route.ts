// app/api/watchlist/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

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
      return NextResponse.json({ error: 'No startup profile' }, { status: 400 });
    }

    // Build query with optional filters
    let query = supabase
      .from('watchlist')
      .select(`
        *,
        grants (id, name, provider, provider_type, deadline, amount_max, sectors)
      `)
      .eq('startup_id', startup.id);

    // Filter by deadline (upcoming = next 30 days)
    const deadlineFilter = searchParams.get('deadline');
    if (deadlineFilter === 'upcoming') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      query = query.lte('grants.deadline', thirtyDaysFromNow.toISOString());
    }

    const { data: watchlist, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: watchlist });
  } catch (error) {
    console.error('Watchlist list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
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
      return NextResponse.json({ error: 'No startup profile' }, { status: 400 });
    }

    const { grant_id, notify_deadline = true, notify_changes = true } = await request.json();

    if (!grant_id) {
      return NextResponse.json({ error: 'grant_id required' }, { status: 400 });
    }

    // Check if already exists
    const { data: existing } = await supabase
      .from('watchlist')
      .select('id')
      .eq('startup_id', startup.id)
      .eq('grant_id', grant_id)
      .single();

    if (existing) {
      return NextResponse.json({ data: existing, message: 'Already in watchlist' });
    }

    const { data: watchlistItem, error } = await supabase
      .from('watchlist')
      .insert({
        startup_id: startup.id,
        grant_id,
        notify_deadline,
        notify_changes,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: watchlistItem });
  } catch (error) {
    console.error('Watchlist add error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
