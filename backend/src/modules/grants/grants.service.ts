
import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class GrantsService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
  }

  async findAll(query: any) {
    let q = this.supabase.from('grants').select('*', { count: 'exact' }).eq('is_active', true);
    
    if (query.search) {
      q = q.or(`name.ilike.%${query.search}%,description.ilike.%${query.search}%`);
    }
    
    const page = parseInt(query.page || '1');
    const perPage = parseInt(query.per_page || '20');
    const from = (page - 1) * perPage;
    
    q = q.range(from, from + perPage - 1);
    
    const { data, count, error } = await q;
    if (error) throw error;
    
    return { data, total: count, page, per_page: perPage };
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase.from('grants').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }
}
