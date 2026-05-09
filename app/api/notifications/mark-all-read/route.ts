import { createClient } from '@/lib/supabase/server';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function POST() {
  try {
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

    // Mark all notifications as read for this startup
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('startup_id', startup.id)
      .eq('is_read', false);

    if (error) {
      return apiError(error.message, 500);
    }

    return apiSuccess({ success: true });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return apiError('Internal server error', 500);
  }
}
