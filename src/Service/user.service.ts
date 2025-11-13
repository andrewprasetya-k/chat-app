import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from 'src/Supabase/supabase.service';

@Injectable()
export class UserService {
  constructor(private readonly supabase: SupabaseService) {}

  // Ambil semua user (untuk admin / testing)
  async getAllUsers() {
    const client = this.supabase.getClient();
    const { data, error } = await client.from('user').select('*');
    if (error) throw new Error(error.message);
    return data;
  }

  // Cari user berdasarkan email
  async findByEmail(email: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('user')
      .select('*')
      .eq('email', email)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data; // undefined kalau tidak ada
  }

  // Buat user baru (register)
  async createUser(payload: { email: string; username?: string; password: string }) {
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

    if (error) throw new Error(error.message);
    // Hapus password_hash sebelum return (opsional)
    if (data) {
      delete data.password_hash;
    }
    return data;
  }
}