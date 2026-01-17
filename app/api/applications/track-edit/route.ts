// app/api/applications/track-edit/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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
      return NextResponse.json({ error: 'No startup profile found' }, { status: 400 });
    }

    const { grantId, questionId, originalAnswer, editedAnswer } = await request.json();

    if (!grantId || !questionId || !originalAnswer || !editedAnswer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Don't track if answers are the same
    if (originalAnswer === editedAnswer) {
      return NextResponse.json({ data: { tracked: false, reason: 'no_change' } });
    }

    // Find or create application for this grant
    let { data: application } = await supabase
      .from('applications')
      .select('id')
      .eq('startup_id', startup.id)
      .eq('grant_id', grantId)
      .single();

    if (!application) {
      // Create a new application record
      const { data: newApp, error: createError } = await supabase
        .from('applications')
        .insert({
          startup_id: startup.id,
          grant_id: grantId,
          status: 'draft',
          answers: [],
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating application:', createError);
        return NextResponse.json({ error: 'Failed to create application' }, { status: 500 });
      }

      application = newApp;
    }

    // Insert the edit record
    const { error: insertError } = await supabase
      .from('answer_edits')
      .insert({
        application_id: application.id,
        question_id: questionId,
        original_answer: originalAnswer,
        edited_answer: editedAnswer,
      });

    if (insertError) {
      console.error('Error tracking edit:', insertError);
      return NextResponse.json({ error: 'Failed to track edit' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        tracked: true,
        application_id: application.id,
      },
    });
  } catch (error) {
    console.error('Track edit error:', error);
    return NextResponse.json({ error: 'Failed to track edit' }, { status: 500 });
  }
}
