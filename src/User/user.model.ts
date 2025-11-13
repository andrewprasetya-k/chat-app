import { IsEmail, IsNotEmpty, IsString, IsOptional, IsISO8601, IsIn } from 'class-validator';

export class UserModel {
  @IsString()
  @IsOptional()
  usr_id?: string;

  @IsString()
  @IsNotEmpty({ message: 'Full name should not be empty' })
  usr_nama_lengkap: string;

  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email should not be empty' })
  usr_email: string;

  // Password hash stored in DB (do not expose in responses)
  @IsString()
  @IsOptional()
  usr_password?: string;

  @IsString()
  @IsOptional()
  @IsIn(['user', 'admin'])
  usr_role?: string;

  @IsOptional()
  @IsISO8601()
  created_at?: string;

  @IsOptional()
  @IsISO8601()
  updated_at?: string;
}