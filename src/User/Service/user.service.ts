import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from 'src/Supabase/supabase.service';

@Injectable()
export class UserService {
  constructor(private readonly supabase: SupabaseService) {}

  async getAllUsers() {
    try {
      const client = this.supabase.getClient();
      const { data, error } = await client
        .from('user')
        .select(
          'usr_id, usr_nama_lengkap, usr_email, usr_role, created_at, updated_at',
        );
      if (error) {
        throw new InternalServerErrorException(error.message);
      }
      return data;
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof InternalServerErrorException
      )
        throw err;
      throw new InternalServerErrorException('Failed to fetch users');
    }
  }

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
      return data;
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof InternalServerErrorException
      )
        throw err;
      throw new InternalServerErrorException('Failed to query user by email');
    }
  }

  async createUser(payload: {
    email: string;
    fullName?: string;
    password: string;
    role?: string;
  }) {
    try {
      const client = this.supabase.getClient();

      const existing = await this.findByEmail(payload.email);
      if (existing) {
        throw new BadRequestException('Email already registered');
      }

      const passwordHash = await bcrypt.hash(payload.password, 10);

      const now = new Date().toISOString();

      const insertPayload: any = {
        usr_nama_lengkap: payload.fullName ?? null,
        usr_email: payload.email,
        usr_password: passwordHash,
        created_at: now,
        updated_at: now,
      };

      if (payload.role !== undefined && payload.role !== null) {
        insertPayload.usr_role = payload.role;
      }

      const { data, error } = await client
        .from('user')
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        const msg = String(error.message || error);

        if (msg.includes('invalid input value for enum')) {
          throw new BadRequestException(
            'Invalid role value for usr_role; please use a valid role defined in the database enum',
          );
        }

        if (error.code && String(error.code).startsWith('235')) {
          throw new BadRequestException(error.message);
        }

        throw new InternalServerErrorException(error.message);
      }

      if (data && typeof data === 'object') {
        delete (data as any).usr_password;
      }

      return data;
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof InternalServerErrorException
      )
        throw err;
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async getUserByIdService(userId: string) {
    const client = this.supabase.getClient();
    try {
      const { data, error } = await client
        .from('user')
        .select('usr_id, usr_nama_lengkap, usr_role, usr_email')
        .eq('usr_id', userId)
        .maybeSingle();

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      if (!data) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      return { success: true, data };
    } catch (error: any) {
      // Re-throw known exceptions
      if (
        error instanceof NotFoundException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        error?.message || 'Failed to get user',
      );
    }
  }

  async editUserService(body: any) {
    const client = this.supabase.getClient();
    try {
      const now = new Date().toISOString();
      const updatePayload: any = {
        usr_nama_lengkap: body.usr_nama_lengkap,
        updated_at: now,
      };

      const { data, error } = await client
        .from('user')
        .update(updatePayload)
        .eq('usr_id', body.usr_id)
        .select()
        .single();

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      if (data && typeof data === 'object') {
        delete (data as any).usr_password;
      }

      return { success: true, data };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to edit user',
      );
    }
  }
}
