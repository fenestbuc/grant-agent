// app/api/grants/recommended/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { computeRelevanceScore } from '@/lib/utils/relevance-scoring';
import type { Grant, Startup } from '@/types';

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's startup profile
    const { data: startup, error: startupError } = await supabase
      .from('startups')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (startupError || !startup) {
      return NextResponse.json(
        { error: 'No startup profile found. Please complete your profile first.' },
        { status: 400 }
      );
    }

    // Fetch all active grants
    const { data: grants, error: grantsError } = await supabase
      .from('grants')
      .select('*')
      .eq('is_active', true);

    if (grantsError) {
      return NextResponse.json({ error: grantsError.message }, { status: 500 });
    }

    if (!grants || grants.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Compute relevance for each grant and sort by score
    const scoredGrants = grants
      .map((grant: Grant) => {
        const { score, reasons } = computeRelevanceScore(grant, startup as Startup);
        return {
          ...grant,
          relevance_score: score,
          match_reasons: reasons,
        };
      })
      .filter((g) => g.relevance_score > 0)
      .sort((a, b) => b.relevance_score - a.relevance_score);

    return NextResponse.json({ data: scoredGrants });
  } catch (error) {
    console.error('Recommended grants error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
