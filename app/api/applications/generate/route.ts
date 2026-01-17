// app/api/applications/generate/route.ts
import { createClient } from '@/lib/supabase/server';
import { generateQueryEmbedding } from '@/lib/llm/document-processor';
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

let anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
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
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!startup) {
      return NextResponse.json({ error: 'No startup profile found' }, { status: 400 });
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

    // Generate answer using Claude
    const response = await getAnthropic().messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: maxLength ? Math.min(maxLength * 2, 4000) : 2000,
      messages: [
        {
          role: 'user',
          content: `You are helping a startup founder write a compelling grant application answer.

STARTUP PROFILE:
${startupContext}

RELEVANT DOCUMENTS:
${context || 'No documents uploaded yet.'}

GRANT: ${grantName || 'Grant application'}

QUESTION: ${question}

${maxLength ? `CHARACTER LIMIT: ${maxLength} characters` : ''}

Write a professional, compelling answer that:
1. Directly addresses the question
2. Uses specific facts and data from the documents when available
3. Highlights the startup's strengths relevant to the question
4. Is concise and impactful
${maxLength ? `5. Stays within ${maxLength} characters` : ''}

If the documents don't contain relevant information, use the startup profile and write a reasonable answer that the founder can edit.

Answer:`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response format');
    }

    // Build sources array
    const sources = chunks?.map((chunk: { document_id: string; content: string; similarity: number }) => ({
      document_id: chunk.document_id,
      document_name: docMap.get(chunk.document_id) || 'Unknown',
      chunk_content: chunk.content.slice(0, 200) + '...',
      relevance_score: chunk.similarity,
    })) || [];

    return NextResponse.json({
      data: {
        answer: content.text,
        sources,
      },
    });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json({ error: 'Answer generation failed' }, { status: 500 });
  }
}
