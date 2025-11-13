import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from 'src/Supabase/supabase.service';

@Injectable()
export class UserService {
  constructor(private readonly supabase: SupabaseService) {}

  // Ambil semua user (untuk admin / testing)
  async getAllUsers() {
    try {
      const client = this.supabase.getClient();
      const { data, error } = await client.from('user').select('*');
      if (error) {
        throw new InternalServerErrorException(error.message);
      }
      return data;
    } catch (err) {
      // bubble up Nest-friendly errors, or wrap unknown errors
      if (err instanceof BadRequestException || err instanceof InternalServerErrorException) throw err;
      throw new InternalServerErrorException('Failed to fetch users');
    }
  }

  // Cari user berdasarkan email
  async findByEmail(email: string) {
    try {
      const client = this.supabase.getClient();
      const { data, error } = await client
        .from('user')
        .select('*')
        .eq('email', email)
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      return data; // null jika tidak ada
    } catch (err) {
      if (err instanceof InternalServerErrorException) throw err;
      throw new InternalServerErrorException('Failed to query user by email');
    }
  }

  // Buat user baru (register)
  async createUser(payload: { email: string; username?: string; password: string }) {
    try {
      const client = this.supabase.getClient();

      // validasi sederhana: cek duplicate email
      const existing = await this.findByEmail(payload.email);
      if (existing) {
        throw new BadRequestException('Email already registered');
      }

      // hash password
      const passwordHash = await bcrypt.hash(payload.password, 10);

      const { data, error } = await client
        .from('user')
        .insert({
          email: payload.email,
          username: payload.username ?? null,
          password_hash: passwordHash,
        })
        .select()
        .single();

      if (error) {
        // If Supabase returns a constraint error (e.g., unique violation), map to BadRequest
        if (error.code && String(error.code).startsWith('235')) {
          // Postgres unique_violation codes usually start with '23505'
          throw new BadRequestException(error.message);
        }
        throw new InternalServerErrorException(error.message);
      }

      // Hapus password_hash sebelum return (opsional)
      if (data && typeof data === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (data as any).password_hash;
      }

      return data;
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof InternalServerErrorException) throw err;
      throw new InternalServerErrorException('Failed to create user');
    }
  }
}