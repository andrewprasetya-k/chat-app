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
import { plainToInstance } from 'class-transformer';
import { CreateUserDto } from '../Dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly supabase: SupabaseService) {}

  async getAllUsers(): Promise<UserEntity[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('user')
      .select(
        'usr_id, usr_nama_lengkap, usr_email, usr_role, created_at, updated_at',
      );
    if (error) throw new InternalServerErrorException(error.message);
    return plainToInstance(UserEntity, data || [], {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
  }

  async findByEmail(email: string): Promise<UserEntity[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('user')
      .select('usr_id, usr_nama_lengkap, usr_email')
      .ilike('usr_email', `${email}%`);
    if (error) throw new InternalServerErrorException(error.message);
    return plainToInstance(UserEntity, data || [], {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
  }

  async findByEmailForRegister(email: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('user')
      .select('usr_email')
      .eq('usr_email', email);
    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async findByEmailForAuth(email: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('user')
      .select('*')
      .eq('usr_email', email);
    if (error) throw new InternalServerErrorException(error.message);
    return data && data.length > 0 ? data[0] : null;
  }

  async findByIdForAuth(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('user')
      .select('*')
      .eq('usr_id', id)
      .single();
    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async updateRefreshToken(userId: string, refreshToken: string | null) {
    const { error } = await this.supabase
      .getClient()
      .from('user')
      .update({ usr_refresh_token: refreshToken })
      .eq('usr_id', userId);
    if (error) throw new InternalServerErrorException(error.message);
    return { success: true };
  }

  async findByFullName(fullName: string): Promise<UserEntity[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('user')
      .select('usr_id, usr_nama_lengkap, usr_email')
      .ilike('usr_nama_lengkap', `${fullName}%`);
    if (error) throw new InternalServerErrorException(error.message);
    return plainToInstance(UserEntity, data || [], {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
  }

  async getUserByIdService(userId: string): Promise<UserEntity> {
    const { data, error } = await this.supabase
      .getClient()
      .from('user')
      .select('usr_id, usr_nama_lengkap, usr_role, usr_email')
      .eq('usr_id', userId)
      .limit(1);
    if (error) throw new InternalServerErrorException(error.message);
    if (!data || data.length === 0)
      throw new NotFoundException(`User ${userId} not found`);
    return plainToInstance(UserEntity, data[0], {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
  }

  async createUser(payload: CreateUserDto & { verificationToken?: string }) {
    const existing = await this.findByEmailForRegister(payload.email);
    if (existing && existing.length > 0)
      throw new BadRequestException('Email already registered');

    const hash = await bcrypt.hash(payload.password, 10);
    const now = new Date().toISOString();
    const insertData = {
      usr_nama_lengkap: payload.fullName || null,
      usr_email: payload.email,
      usr_password: hash,
      created_at: now,
      updated_at: now,
      usr_role: payload.role || 'user',
      usr_is_verified: !payload.verificationToken,
      usr_verification_token: payload.verificationToken || null,
    };

    const { data, error } = await this.supabase
      .getClient()
      .from('user')
      .insert(insertData)
      .select()
      .single();
    if (error) {
      if (error.code === '23505')
        throw new BadRequestException('Email already registered');
      throw new InternalServerErrorException(error.message);
    }
    return { success: true, id: data.usr_id };
  }

  async editUserService(body: EditUserDto, userId: string) {
    const updateData: any = {};
    if (body.fullName !== undefined)
      updateData.usr_nama_lengkap = body.fullName;
    if (body.email !== undefined) updateData.usr_email = body.email;

    const { error } = await this.supabase
      .getClient()
      .from('user')
      .update(updateData)
      .eq('usr_id', userId);
    if (error) {
      if (error.code === '23505')
        throw new BadRequestException('Email already in use');
      throw new InternalServerErrorException(error.message);
    }
    return { success: true };
  }

  async updateAvatar(userId: string, url: string) {
    const { error } = await this.supabase
      .getClient()
      .from('user')
      .update({ usr_avatar: url })
      .eq('usr_id', userId);
    if (error) throw new InternalServerErrorException(error.message);
    return { success: true };
  }

  async verifyUser(token: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('user')
      .update({ usr_is_verified: true, usr_verification_token: null })
      .eq('usr_verification_token', token)
      .select()
      .single();
    if (error || !data) throw new BadRequestException('Invalid token');
    return { success: true };
  }

  async setResetPasswordToken(email: string, token: string) {
    const client = this.supabase.getClient();
    await client.from('password_reset_tokens').delete().eq('email', email);
    const { error } = await client
      .from('password_reset_tokens')
      .insert({
        email,
        token,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      });
    if (error) throw new InternalServerErrorException(error.message);
    return { success: true };
  }

  async resetPassword(token: string, hash: string) {
    const client = this.supabase.getClient();
    const { data: t, error: te } = await client
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .single();
    if (te || !t || new Date(t.expires_at) < new Date())
      throw new BadRequestException('Invalid token');

    const { error: ue } = await client
      .from('user')
      .update({ usr_password: hash })
      .eq('usr_email', t.email);
    if (ue) throw new InternalServerErrorException(ue.message);
    await client.from('password_reset_tokens').delete().eq('token', token);
    return { success: true };
  }

  async verifyUserByEmail(email: string) {
    const { error } = await this.supabase
      .getClient()
      .from('user')
      .update({ usr_is_verified: true, usr_verification_token: null })
      .eq('usr_email', email);
    if (error) throw new InternalServerErrorException(error.message);
    return { success: true };
  }

  async updateOnlineStatus(userId: string, isOnline: boolean) {
    const data: any = { usr_is_online: isOnline };
    if (!isOnline) data.usr_last_seen = new Date().toISOString();
    const { error } = await this.supabase
      .getClient()
      .from('user')
      .update(data)
      .eq('usr_id', userId);
    if (error) throw new InternalServerErrorException(error.message);
    return { success: true };
  }
}
