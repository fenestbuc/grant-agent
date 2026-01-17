// app/api/applications/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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
      return NextResponse.json({ error: 'No startup profile' }, { status: 400 });
    }

    const { data: applications, error } = await supabase
      .from('applications')
      .select(`
        *,
        grants (id, name, provider, deadline, amount_max)
      `)
      .eq('startup_id', startup.id)
      .order('updated_at', { ascending: false });

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

    const { grant_id } = await request.json();

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
      return NextResponse.json({ data: existing });
    }

    // Get grant questions to initialize answers
    const { data: grant } = await supabase
      .from('grants')
      .select('application_questions')
      .eq('id', grant_id)
      .single();

    const questions = grant?.application_questions || [];
    const initialAnswers = questions.map((q: { id: string; question: string; required: boolean }) => ({
      question_id: q.id,
      question: q.question,
      generated_answer: null,
      edited_answer: null,
      sources: [],
      is_edited: false,
    }));

    const { data: application, error } = await supabase
      .from('applications')
      .insert({
        startup_id: startup.id,
        grant_id,
        status: 'draft',
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
