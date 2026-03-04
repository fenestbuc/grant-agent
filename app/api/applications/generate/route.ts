// app/api/applications/generate/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { grantId, questionId } = await request.json();

  // Fetch grant details
  const { data: grant } = await supabase
    .from('grants')
    .select('*')
    .eq('id', grantId)
    .single();

  if (!grant) {
    return NextResponse.json({ error: 'Grant not found' }, { status: 404 });
  }

  // Fetch startup profile
  const { data: startup } = await supabase
    .from('startups')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!startup) {
    return NextResponse.json({ error: 'Startup profile not found' }, { status: 404 });
  }

  // Find the specific question
  const question = grant.questions?.find((q: { id: string }) => q.id === questionId);
  if (!question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 });
  }

  // Check and update usage
  const currentMonth = new Date().toISOString().slice(0, 7);
  const { data: usageRecord } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('user_id', user.id)
    .eq('month', currentMonth)
    .single();

  const MONTHLY_LIMIT = 50;

  if (usageRecord && usageRecord.generations_used >= MONTHLY_LIMIT) {
    return NextResponse.json(
      { error: 'Monthly generation limit reached' },
      { status: 429 },
    );
  }

  // Generate the answer with AI
  const prompt = `You are helping a startup apply for a grant. Generate a compelling answer for the following grant application question.

Grant: ${grant.name}
Organization: ${grant.organization}
Grant Description: ${grant.description}

Startup Information:
Name: ${startup.name}
Description: ${startup.description || 'Not provided'}
Industry: ${startup.industry || 'Not provided'}
Stage: ${startup.stage || 'Not provided'}
Location: ${startup.location || 'Not provided'}

Question: ${question.question}
${question.guidance ? `Guidance: ${question.guidance}` : ''}
${question.max_words ? `Maximum words: ${question.max_words}` : ''}

Write a professional, specific, and compelling answer that highlights the startup's strengths and alignment with the grant's objectives. Be concise but thorough.`;

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const answer = message.content[0].type === 'text' ? message.content[0].text : '';

  // Track usage - upsert to handle both insert and update
  await supabase.from('usage_tracking').upsert(
    {
      user_id: user.id,
      month: currentMonth,
      generations_used: (usageRecord?.generations_used || 0) + 1,
    },
    { onConflict: 'user_id,month' },
  );

  return NextResponse.json({ answer });
}
