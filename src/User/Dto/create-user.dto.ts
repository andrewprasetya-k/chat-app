import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Full name cannot be empty' })
  fullName: string;

  @IsString()
  @IsNotEmpty({ message: 'Password cannot be empty' })
  password: string;

  @IsNotEmpty({ message: 'Email cannot be empty' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString()
  @IsOptional()
  role?: string;
}
