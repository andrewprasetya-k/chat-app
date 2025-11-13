/**
 * SupabaseService
 * ----------------
 * Lightweight wrapper around the official `@supabase/supabase-js` client.
 * - Initializes the Supabase client on module init using environment variables
 *   (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
 * - Exposes `getClient()` for low-level access and a couple of small
 *   helper methods for basic select/insert operations.
 *
 * NOTE: The service-role key is required for trusted server operations and
 * must be provided via server environment variables (do not commit it).
 */
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
}
