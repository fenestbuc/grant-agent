/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class ApplicationsService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || 'https://mock.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-key'
    );
  }

  async findAll(userId: string, grantId?: string) {
    const { data: startup } = await this.supabase
      .from('startups')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!startup) throw new BadRequestException('Startup not found');

    let q = this.supabase.from('applications').select('*').eq('startup_id', startup.id);
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
    return { answer: 'Mock generated answer using RAG' };
  }
}
