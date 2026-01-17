// app/api/notifications/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { Notification } from '@/types';

interface NotificationsResponse {
  data: Notification[];
  unreadCount: number;
}

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

    // Parse query params
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const type = searchParams.get('type');

    // Build query for notifications
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('startup_id', startup.id);

    // Optional type filter
    if (type) {
      query = query.eq('type', type);
    }

    // Order by created_at descending and apply limit
    const { data: notifications, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get unread count
    const { count: unreadCount, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('startup_id', startup.id)
      .eq('is_read', false);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    const response: NotificationsResponse = {
      data: notifications || [],
      unreadCount: unreadCount || 0,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Notifications list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
