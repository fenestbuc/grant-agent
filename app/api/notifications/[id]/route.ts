import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

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

    // Mark the notification as read
    const { data: notification, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('startup_id', startup.id)
      .select()
      .single();

    if (error) {
      return apiError(error.message, 500);
    }

    if (!notification) {
      return apiError('Notification not found', 404);
    }

    return apiSuccess(notification);
  } catch (error) {
    console.error('Notification mark read error:', error);
    return apiError('Internal server error', 500);
  }
}
