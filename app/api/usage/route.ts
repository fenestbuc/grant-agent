// app/api/usage/route.ts
import { createClient } from '@/lib/supabase/server';
import { getUsageStatus, LIMITS } from '@/lib/usage-limits';
import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
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
      return NextResponse.json({ error: 'No startup profile found' }, { status: 400 });
    }

    const status = await getUsageStatus(startup.id);

    return NextResponse.json({
      data: status,
    });
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
