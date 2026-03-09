// app/api/applications/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const grantId = searchParams.get('grant_id');

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

    let query = supabase
      .from('applications')
      .select(`
        *,
        grants (id, name, provider, deadline, amount_max)
      `)
      .eq('startup_id', startup.id);

    // Filter by grant_id if provided
    if (grantId) {
      query = query.eq('grant_id', grantId);
    }

    query = query.order('updated_at', { ascending: false });

    const { data: applications, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: applications });
  } catch (error) {
    console.error('Applications list error:', error);
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

    const body = await request.json();
    const { grant_id, answers: providedAnswers, status: providedStatus } = body;

    if (!grant_id) {
      return NextResponse.json({ error: 'grant_id required' }, { status: 400 });
    }

    // Check if application already exists
    const { data: existing } = await supabase
      .from('applications')
      .select('id')
      .eq('startup_id', startup.id)
      .eq('grant_id', grant_id)
      .single();

    if (existing) {
      // If answers provided, update the existing application
      if (providedAnswers) {
        const { data: updated, error: updateError } = await supabase
          .from('applications')
          .update({
            answers: providedAnswers,
            status: providedStatus || 'draft',
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }
        return NextResponse.json({ data: updated });
      }
      return NextResponse.json({ data: existing });
    }

    // Determine initial answers
    let initialAnswers = providedAnswers;
    if (!initialAnswers) {
      // Get grant questions to initialize answers
      const { data: grant } = await supabase
        .from('grants')
        .select('application_questions')
        .eq('id', grant_id)
        .single();

      const questions = grant?.application_questions || [];
      initialAnswers = questions.map((q: { id: string; question: string; required: boolean }) => ({
        question_id: q.id,
        question: q.question,
        generated_answer: null,
        edited_answer: null,
        sources: [],
        is_edited: false,
      }));
    }

    const { data: application, error } = await supabase
      .from('applications')
      .insert({
        startup_id: startup.id,
        grant_id,
        status: providedStatus || 'draft',
        answers: initialAnswers,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: application });
  } catch (error) {
    console.error('Application create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
