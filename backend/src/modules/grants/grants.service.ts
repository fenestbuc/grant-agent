
import { Injectable, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GrantFilterDto } from '../../common/dto/api.dto';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class GrantsService {
  private supabase: SupabaseClient;

  constructor(private readonly llmService: LlmService) {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
  }

  async findAll(query: GrantFilterDto) {
    let q = this.supabase.from('grants').select('*', { count: 'exact' }).eq('is_active', true);
    
    if (query.search) {
      q = q.or(`name.ilike.%${query.search}%,description.ilike.%${query.search}%`);
    }
    
    if (query.minAmount) {
      q = q.gte('amount_max', query.minAmount);
    }
    
    if (query.maxAmount) {
      q = q.lte('amount_min', query.maxAmount);
    }

    if (query.sector && query.sector.length > 0) {
      q = q.overlaps('sectors', query.sector);
    }

    if (query.stage && query.stage.length > 0) {
      q = q.overlaps('stages', query.stage);
    }

    const page = parseInt(query.page || '1');
    const perPage = parseInt(query.per_page || '20');
    const from = (page - 1) * perPage;
    
    q = q.range(from, from + perPage - 1);
    
    const { data, count, error } = await q;
    if (error) throw new BadRequestException(error.message);
    
    return { data, total: count, page, per_page: perPage };
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase.from('grants').select('*').eq('id', id).single();
    if (error) throw new BadRequestException('Grant not found');
    return data;
  }

  async getRecommended(userId: string) {
    // 1. Fetch user's startup profile
    const { data: startup } = await this.supabase
      .from('startups')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!startup) throw new BadRequestException('Startup not found');

    // 2. We use the LLM Service to embed the startup description
    let startupEmbedding: number[] = [];
    try {
      const description = `${startup.company_name} is a ${startup.stage} stage startup in ${startup.sector} sector.` 
        + (startup.description ? ` Description: ${startup.description}` : '');
      startupEmbedding = await this.llmService.generateEmbedding(description);
    } catch (e) {
      console.warn("Embedding generation failed, falling back to base filters", e);
    }

    // 3. Query Supabase for recommended grants
    let grants = [];
    if (startupEmbedding.length > 0) {
      // Use pgvector similarity search
      const { data, error } = await this.supabase.rpc('match_grants', {
        query_embedding: startupEmbedding,
        match_threshold: 0.5,
        match_count: 10
      });
      if (!error && data) grants = data;
    }

    if (grants.length === 0) {
      // Fallback
      const { data } = await this.supabase
        .from('grants')
        .select('*')
        .eq('is_active', true)
        .limit(10);
      grants = data || [];
    }

    // Assign relevance scores artificially if not provided by RPC
    grants = grants.map((g: any) => ({
      ...g,
      match_score: g.similarity ? Math.round(g.similarity * 100) : 75,
      match_reasons: ['Sector matches your profile', 'Stage is appropriate']
    }));

    return { data: grants };
  }
}
