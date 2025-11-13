/**
 * SupabaseModule
 * --------------
 * Provides the `SupabaseService` as a reusable provider. Import this
 * module into `AppModule` or feature modules to access the Supabase client.
 */
import { Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}
