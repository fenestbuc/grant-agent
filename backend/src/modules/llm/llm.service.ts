
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class LlmService {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private supabase: SupabaseClient;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: text.replace(/\n/g, ' '),
        dimensions: 1536,
      });
      return response.data[0].embedding;
    } catch (error: any) {
      throw new InternalServerErrorException(`Embedding failed: ${error.message}`);
    }
  }

  async generateAnswer(startupId: string, question: string, grantName: string, maxLength: number = 2000): Promise<string> {
    // 1. Generate query embedding
    const queryEmbedding = await this.generateEmbedding(question);

    // 2. Perform vector search in Supabase
    const { data: chunks, error } = await this.supabase.rpc('match_kb_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 5,
      p_startup_id: startupId
    });

    if (error) {
      console.error('Vector search error:', error);
      // Fallback to generating without context
    }

    const contextText = chunks && chunks.length > 0 
      ? chunks.map((c: any) => c.content).join('\n\n')
      : 'No specific context found.';

    // 3. Ask Claude
    const prompt = `
You are an expert grant writer. Answer the following grant application question for the startup based on the provided context.
Grant Name: ${grantName}
Question: ${question}

Context from Startup Knowledge Base:
${contextText}

Guidelines:
1. Be concise, persuasive, and factual.
2. Rely primarily on the provided context.
3. Keep the response under ${maxLength} characters.
4. If the context lacks information to answer the question, write a generic strong placeholder and mark it with [NEEDS INFO].
`;

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    return (response.content[0] as any).text;
  }
}
