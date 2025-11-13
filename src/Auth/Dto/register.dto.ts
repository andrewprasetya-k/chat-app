import { IsEmail, IsNotEmpty, IsString, IsOptional, IsIn, IsISO8601 } from 'class-validator';

/**
 * RegisterDto
 * - fullName -> maps to `usr_nama_lengkap`
 * - email -> maps to `usr_email` (unique, not null)
 * - password -> plain password (will be hashed before insert -> usr_password)
 * - role -> optional, maps to `usr_role` (defaults to 'user' if not provided)
 */

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Full name should not be empty' })
  fullName: string;

  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email should not be empty' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password should not be empty' })
  password: string;
}