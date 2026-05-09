import { Injectable, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class WatchlistService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || 'https://mock.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-key'
    );
  }

  async findAll(userId: string) {
    const { data: startup } = await this.supabase
      .from('startups')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!startup) throw new BadRequestException('Startup not found');

    const { data, error } = await this.supabase
      .from('watchlist')
      .select('*, grants (id, name, provider, provider_type, deadline, amount_max, sectors)')
      .eq('startup_id', startup.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}
