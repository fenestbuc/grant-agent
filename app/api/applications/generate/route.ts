// app/api/applications/generate/route.ts
import { createClient } from '@/lib/supabase/server';
import { generateQueryEmbedding } from '@/lib/llm/document-processor';
import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

let openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

// Usage limits
const LIFETIME_ANSWER_LIMIT = 70;
const DAILY_APPLICATION_LIMIT = 10;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: startup } = await supabase
      .from('startups')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!startup) {
      return NextResponse.json({ error: 'No startup profile found' }, { status: 400 });
    }

    // Check usage limits
    const today = new Date().toISOString().split('T')[0];
    const isNewDay = !startup.last_application_date || startup.last_application_date < today;
    const currentAnswers = startup.answers_generated || 0;
    const currentAppsToday = isNewDay ? 0 : (startup.applications_today || 0);

    if (currentAnswers >= LIFETIME_ANSWER_LIMIT) {
      return NextResponse.json({
        error: 'You have reached the lifetime limit of 70 AI-generated answers. Please contact support for more.',
        code: 'LIFETIME_LIMIT_REACHED',
      }, { status: 429 });
    }

    if (currentAppsToday >= DAILY_APPLICATION_LIMIT) {
      return NextResponse.json({
        error: 'You have reached the daily limit of 10 applications. Please try again tomorrow.',
        code: 'DAILY_LIMIT_REACHED',
      }, { status: 429 });
    }

    const { question, grantName, maxLength } = await request.json();

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    // Search for relevant context
    const queryEmbedding = await generateQueryEmbedding(question);

    const { data: chunks } = await supabase.rpc('match_kb_chunks', {
      query_embedding: queryEmbedding,
      match_startup_id: startup.id,
      match_threshold: 0.6,
      match_count: 5,
    });

    // Get document names
    const documentIds = [...new Set(chunks?.map((c: { document_id: string }) => c.document_id) || [])];
    const { data: documents } = await supabase
      .from('kb_documents')
      .select('id, filename')
      .in('id', documentIds);
    const docMap = new Map(documents?.map((d) => [d.id, d.filename]) || []);

    // Build context from chunks
    const context = chunks?.map((chunk: { content: string; document_id: string }) =>
      `[From ${docMap.get(chunk.document_id) || 'document'}]: ${chunk.content}`
    ).join('\n\n') || '';

    // Build startup profile context
    const startupContext = `
Startup: ${startup.name}
Sector: ${startup.sector}
Stage: ${startup.stage}
Location: ${startup.city}, ${startup.state}
Team Size: ${startup.team_size}
Founded: ${startup.founded_date || 'Not specified'}
${startup.is_dpiit_registered ? 'DPIIT Registered' : ''}
${startup.is_women_led ? 'Women-led' : ''}
Description: ${startup.description || 'Not provided'}
    `.trim();

    // Generate answer using GPT-4o-mini
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: maxLength ? Math.min(maxLength * 2, 4000) : 2000,
      messages: [
        {
          role: 'system',
          content: `You are an expert grant application writer helping Indian startups secure funding.

CRITICAL RULES:
1. Never mention word counts, character limits, or say "Word count: X out of Y" in your output
2. Never include meta-commentary about the answer length or format
3. Write the answer directly without any preamble like "Here is your answer:" or "Answer:"
4. Be specific and use concrete details from the provided context
5. If context is limited, write a reasonable answer based on the startup profile that the founder can edit

Your answers should be compelling, specific, and directly address the question asked.`,
        },
        {
          role: 'user',
          content: `You are helping a startup founder write a compelling grant application answer.

STARTUP PROFILE:
${startupContext}

RELEVANT DOCUMENTS:
${context || 'No documents uploaded yet.'}

GRANT: ${grantName || 'Grant application'}

QUESTION: ${question}

${maxLength ? `Keep the answer under ${maxLength} characters.` : ''}

Write a professional, compelling answer that:
1. Directly addresses the question
2. Uses specific facts and data from the documents when available
3. Highlights the startup's strengths relevant to the question
4. Is concise and impactful

If the documents don't contain relevant information, use the startup profile and write a reasonable answer that the founder can edit.

Answer:`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Unexpected response format from OpenAI');
    }

    // Increment usage counter
    await supabase.rpc('increment_answers_generated', { p_startup_id: startup.id });

    // Build sources array
    const sources = chunks?.map((chunk: { document_id: string; content: string; similarity: number }) => ({
      document_id: chunk.document_id,
      document_name: docMap.get(chunk.document_id) || 'Unknown',
      chunk_content: chunk.content.slice(0, 200) + '...',
      relevance_score: chunk.similarity,
    })) || [];

    return NextResponse.json({
      data: {
        answer: content.trim(),
        sources,
      },
    });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json({ error: 'Answer generation failed' }, { status: 500 });
  }
}
