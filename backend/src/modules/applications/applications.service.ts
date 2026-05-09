
import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class ApplicationsService {
  private supabase: SupabaseClient;

  constructor(private readonly llmService: LlmService) {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
  }

  async findAll(userId: string, grantId?: string) {
    const { data: startup } = await this.supabase
      .from('startups')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!startup) throw new BadRequestException('Startup not found');

    let q = this.supabase.from('applications').select('*, grants(name)').eq('startup_id', startup.id);
    if (grantId) q = q.eq('grant_id', grantId);

    const { data, error } = await q;
    if (error) throw error;
    return data;
  }

  async createOrUpdate(userId: string, dto: any) {
    const { data: startup } = await this.supabase
      .from('startups')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!startup) throw new BadRequestException('Startup not found');

    if (dto.id) {
      const { data, error } = await this.supabase
        .from('applications')
        .update({ answers: dto.answers, status: dto.status })
        .eq('id', dto.id)
        .eq('startup_id', startup.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await this.supabase
        .from('applications')
        .insert({
          startup_id: startup.id,
          grant_id: dto.grantId,
          answers: dto.answers,
          status: dto.status || 'draft',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }

  async generateAnswer(userId: string, grantId: string, questionId: string) {
    // 1. Get Startup Profile
    const { data: startup, error: startupError } = await this.supabase
      .from('startups')
      .select('id, answers_generated')
      .eq('user_id', userId)
      .single();

    if (startupError || !startup) throw new BadRequestException('Startup not found');

    // Usage check
    if (startup.answers_generated >= 100) {
      throw new BadRequestException('Monthly generation limit reached.');
    }

    // 2. Get Grant Details (for question text and limits)
    const { data: grant } = await this.supabase
      .from('grants')
      .select('name, questions')
      .eq('id', grantId)
      .single();

    if (!grant) throw new BadRequestException('Grant not found');

    const questionObj = (grant.questions || []).find((q: any) => q.id === questionId);
    if (!questionObj) throw new BadRequestException('Question not found in grant');

    // 3. Generate Answer using LLM + RAG
    const answer = await this.llmService.generateAnswer(
      startup.id,
      questionObj.question,
      grant.name,
      questionObj.max_length || 2000
    );

    // 4. Increment usage tracking safely via RPC
    await this.supabase.rpc('increment_answers_generated', { row_id: startup.id });

    return { answer };
  }
}
