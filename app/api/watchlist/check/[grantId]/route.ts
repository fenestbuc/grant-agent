// app/api/watchlist/check/[grantId]/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ grantId: string }> }
): Promise<NextResponse> {
  try {
    const { grantId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ data: { inWatchlist: false, watchlistId: null } });
    }

    const { data: startup } = await supabase
      .from('startups')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!startup) {
      return NextResponse.json({ data: { inWatchlist: false, watchlistId: null } });
    }

    const { data: watchlistItem } = await supabase
      .from('watchlist')
      .select('id, notify_deadline, notify_changes')
      .eq('startup_id', startup.id)
      .eq('grant_id', grantId)
      .single();

    return NextResponse.json({
      data: {
        inWatchlist: !!watchlistItem,
        watchlistId: watchlistItem?.id || null,
        notify_deadline: watchlistItem?.notify_deadline ?? true,
        notify_changes: watchlistItem?.notify_changes ?? true,
      },
    });
  } catch (error) {
    console.error('Watchlist check error:', error);
    return NextResponse.json({ data: { inWatchlist: false, watchlistId: null } });
  }
}
