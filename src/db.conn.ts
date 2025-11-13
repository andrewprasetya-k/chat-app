import { Controller, Get, Body } from '@nestjs/common';
import { SupabaseService } from './Supabase/supabase.service';

@Controller('db')
export class AuthController {
  constructor(private readonly supabaseService: SupabaseService) {}

  // POST /auth/register
  @Get('check')
  async checkHealt() {
    // Minta service untuk buat user baru
    return this.supabaseService.getClient();
  }
}
