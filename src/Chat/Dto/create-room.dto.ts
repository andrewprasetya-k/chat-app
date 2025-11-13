import { IsEmail, IsNotEmpty, IsString, IsOptional, IsIn, IsISO8601 } from 'class-validator';

export class CreateRoomDto {
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