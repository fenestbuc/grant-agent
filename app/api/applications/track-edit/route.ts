import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function POST(request: NextRequest) {
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

    const { grantId, questionId, originalAnswer, editedAnswer } = await request.json();

    if (!grantId || !questionId || !originalAnswer || !editedAnswer) {
      return apiError('Missing required fields', 400);
    }

    // Don't track if answers are the same
    if (originalAnswer === editedAnswer) {
      return apiSuccess({ tracked: false, reason: 'no_change' });
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
        return apiError('Failed to create application', 500);
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
      return apiError('Failed to track edit', 500);
    }

    return apiSuccess({
      tracked: true,
      application_id: application.id,
    });
  } catch (error) {
    console.error('Track edit error:', error);
    return apiError('Failed to track edit', 500);
  }
}
