// app/(dashboard)/applications/new/[grantId]/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: Promise<{ grantId: string }>;
}

export default async function NewApplicationPage({ params }: PageProps) {
  const { grantId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: startup } = await supabase
    .from('startups')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!startup) {
    redirect('/onboarding');
  }

  // Check if application exists
  const { data: existing } = await supabase
    .from('applications')
    .select('id')
    .eq('startup_id', startup.id)
    .eq('grant_id', grantId)
    .single();

  if (existing) {
    redirect(`/applications/${existing.id}`);
  }

  // Get grant questions
  const { data: grant } = await supabase
    .from('grants')
    .select('application_questions')
    .eq('id', grantId)
    .single();

  if (!grant) {
    redirect('/grants');
  }

  const questions = grant.application_questions || [];
  const initialAnswers = questions.map((q: { id: string; question: string }) => ({
    question_id: q.id,
    question: q.question,
    generated_answer: null,
    edited_answer: null,
    sources: [],
    is_edited: false,
  }));

  // Create application
  const { data: application, error } = await supabase
    .from('applications')
    .insert({
      startup_id: startup.id,
      grant_id: grantId,
      status: 'draft',
      answers: initialAnswers,
    })
    .select('id')
    .single();

  if (error || !application) {
    redirect(`/grants/${grantId}`);
  }

  redirect(`/applications/${application.id}`);
}
