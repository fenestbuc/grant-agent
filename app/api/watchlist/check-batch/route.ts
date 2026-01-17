// app/api/watchlist/check-batch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: 'Startup not found' }, { status: 404 });
    }

    const { grantIds } = await request.json();

    if (!Array.isArray(grantIds) || grantIds.length === 0) {
      return NextResponse.json({ data: {} });
    }

    // Fetch all watchlist entries for the given grant IDs
    const { data: watchlistItems } = await supabase
      .from('watchlist')
      .select('id, grant_id')
      .eq('startup_id', startup.id)
      .in('grant_id', grantIds);

    // Create a map of grant_id -> watchlist entry
    const watchlistMap: Record<string, { inWatchlist: boolean; watchlistId: string | null }> = {};

    for (const grantId of grantIds) {
      const entry = watchlistItems?.find(w => w.grant_id === grantId);
      watchlistMap[grantId] = {
        inWatchlist: !!entry,
        watchlistId: entry?.id || null,
      };
    }

    return NextResponse.json({ data: watchlistMap });
  } catch (error) {
    console.error('Watchlist batch check error:', error);
    return NextResponse.json({ error: 'Failed to check watchlist' }, { status: 500 });
  }
}
