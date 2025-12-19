import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from 'src/Supabase/supabase.service';
import { EditUserDto } from '../Dto/edit-user.dto';
import { UserEntity } from '../Entity/user.entity';
import { plainToInstance, TransformPlainToInstance } from 'class-transformer';

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

      const transformedData = plainToInstance(UserEntity, data || [], {
        excludeExtraneousValues: true,
        enableImplicitConversion: true,
      });
      return transformedData;
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
        .select('usr_id,usr_nama_lengkap, usr_email')
        .ilike('usr_email', `${email}%`);

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      const transformedData = plainToInstance(UserEntity, data || [], {
        excludeExtraneousValues: true,
        enableImplicitConversion: true,
      });
      return transformedData;
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof InternalServerErrorException
      )
        throw err;
      throw new InternalServerErrorException('Failed to query user by email');
    }
  }

  async findByEmailForRegister(email: string) {
    try {
      const client = this.supabase.getClient();
      const { data, error } = await client
        .from('user')
        .select('usr_email')
        .eq('usr_email', email);

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

  async findByEmailForAuth(email: string) {
    try {
      const client = this.supabase.getClient();
      const { data, error } = await client
        .from('user')
        .select('*')
        .eq('usr_email', email);

      if (error) {
        throw new InternalServerErrorException(error.message);
      }
      return data && data.length > 0 ? data[0] : null;
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof InternalServerErrorException
      )
        throw err;
      throw new InternalServerErrorException('Failed to query user by email');
    }
  }

  async findByFullName(fullName: string) {
    try {
      const client = this.supabase.getClient();
      const { data, error } = await client
        .from('user')
        .select('usr_id, usr_nama_lengkap, usr_email')
        .ilike('usr_nama_lengkap', `${fullName}%`);

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      const transformedData = plainToInstance(UserEntity, data || [], {
        excludeExtraneousValues: true,
        enableImplicitConversion: true,
      });
      return transformedData;
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof InternalServerErrorException
      )
        throw err;
      throw new InternalServerErrorException(
        'Failed to query user by full name',
      );
    }
  }

  async getUserByIdService(userId: string) {
    const client = this.supabase.getClient();
    try {
      const { data, error } = await client
        .from('user')
        .select('usr_id, usr_nama_lengkap, usr_role, usr_email')
        .eq('usr_id', userId)
        .limit(1);

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      if (!data || data.length === 0) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      const transformedData = plainToInstance(UserEntity, data, {
        excludeExtraneousValues: true,
        enableImplicitConversion: true,
      });
      return transformedData;
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

  async createUser(payload: {
    email: string;
    fullName?: string;
    password: string;
    role?: string;
  }) {
    try {
      const client = this.supabase.getClient();
      const existing = await this.findByEmailForRegister(payload.email);
      if (existing && existing.length > 0) {
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

        if (error.code === '23505') {
          // '23505' is the code for unique_violation
          if (error.message.includes('user_usr_email_key')) {
            throw new BadRequestException('Email address already registered');
          }
          // Fallback for other unique constraints
          throw new BadRequestException(
            'A record with this value already exists.',
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

  async editUserService(body: EditUserDto, userId: string) {
    const client = this.supabase.getClient();
    try {
      const updatePayload: any = {};

      if (body.fullName !== undefined) {
        updatePayload.usr_nama_lengkap = body.fullName;
      }

      if (body.email !== undefined) {
        updatePayload.usr_email = body.email;
      }

      const { data, error } = await client
        .from('user')
        .update(updatePayload)
        .eq('usr_id', userId)
        .select()
        .single();

      if (error) {
        if (
          error.code === '23505' &&
          error.message.includes('user_usr_email_key')
        ) {
          throw new BadRequestException(
            'This email address is already in use by another account.',
          );
        }
        throw new InternalServerErrorException(error.message);
      }

      if (data && typeof data === 'object') {
        delete (data as any).usr_password;
      }

      return { success: true, data };
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        error?.message || 'Failed to edit user',
      );
    }
  }
}
