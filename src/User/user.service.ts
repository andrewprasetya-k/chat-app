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
      // Select public-facing columns only (do not return passwords)
      const { data, error } = await client
        .from('user')
        .select('usr_id, usr_nama_lengkap, usr_email, usr_role, created_at, updated_at');
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
        .eq('usr_email', email)
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
  async createUser(payload: { email: string; fullName?: string; password: string; role?: string }) {
    try {
      const client = this.supabase.getClient();

      // validasi sederhana: cek duplicate email
      const existing = await this.findByEmail(payload.email);
      if (existing) {
        throw new BadRequestException('Email already registered');
      }

      // hash password
      const passwordHash = await bcrypt.hash(payload.password, 10);

      const now = new Date().toISOString();

      const insertPayload: any = {
        usr_nama_lengkap: payload.fullName ?? null,
        usr_email: payload.email,
        usr_password: passwordHash,
        created_at: now,
        updated_at: now,
      };

      // Only include usr_role if client explicitly provided one. Do not
      // force a default value here because the DB may define an enum type
      // and reject unknown values (see error: invalid input value for enum).
      if (payload.role !== undefined && payload.role !== null) {
        insertPayload.usr_role = payload.role;
      }

      const { data, error } = await client.from('user').insert(insertPayload).select().single();

      if (error) {
        // Map common DB errors to client-friendly responses.
        const msg = String(error.message || error);

        // Enum type error (e.g. invalid input value for enum role)
        if (msg.includes('invalid input value for enum')) {
          throw new BadRequestException('Invalid role value for usr_role; please use a valid role defined in the database enum');
        }

        // If Supabase returns a constraint error (e.g., unique violation), map to BadRequest
        if (error.code && String(error.code).startsWith('235')) {
          // Postgres unique_violation codes usually start with '23505'
          throw new BadRequestException(error.message);
        }

        throw new InternalServerErrorException(error.message);
      }

      // Hapus password field before returning the user object
      if (data && typeof data === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (data as any).usr_password;
      }

      return data;
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof InternalServerErrorException) throw err;
      throw new InternalServerErrorException('Failed to create user');
    }
  }
}