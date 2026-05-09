import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { Notification } from '@/types';
import { apiError } from '@/lib/api/response';

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
      return apiError('Unauthorized', 401);
    }

    const { data: startup } = await supabase
      .from('startups')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!startup) {
      return apiError('No startup profile', 400);
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
      return apiError(error.message, 500);
    }

    // Get unread count
    const { count: unreadCount, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('startup_id', startup.id)
      .eq('is_read', false);

    if (countError) {
      return apiError(countError.message, 500);
    }

    const response: NotificationsResponse = {
      data: notifications || [],
      unreadCount: unreadCount || 0,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Notifications list error:', error);
    return apiError('Internal server error', 500);
  }
}
