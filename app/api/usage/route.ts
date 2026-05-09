import { createClient } from '@/lib/supabase/server';
import { getUsageStatus, LIMITS } from '@/lib/usage-limits';
import { NextResponse } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function GET() {
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
      return apiError('No startup profile found', 400);
    }

    const status = await getUsageStatus(startup.id);

    return apiSuccess(status);
  } catch (error) {
    console.error('Usage status error:', error);
    // Return default values on error so UI can still render
    return NextResponse.json({
      data: {
        answers_generated: 0,
        answers_remaining: LIMITS.LIFETIME_ANSWERS,
        applications_today: 0,
        applications_remaining_today: LIMITS.DAILY_APPLICATIONS,
        lifetime_limit: LIMITS.LIFETIME_ANSWERS,
        daily_limit: LIMITS.DAILY_APPLICATIONS,
      },
    });
  }
}
