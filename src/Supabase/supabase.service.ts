import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private client: SupabaseClient;

  onModuleInit() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL or Service Key not found in environment variables');
    }

    this.client = createClient(supabaseUrl, supabaseKey);
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  // Contoh helper method umum:
  async findAll(table: string) {
    const { data, error } = await this.client.from(table).select('*');
    if (error) throw new Error(error.message);
    return data;
  }

  async insert(table: string, payload: Record<string, any>) {
    const { data, error } = await this.client.from(table).insert(payload).select();
    if (error) throw new Error(error.message);
    return data;
  }
}
