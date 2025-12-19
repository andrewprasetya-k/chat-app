import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class EditUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Full name cannot be empty' })
  fullName: string;

  @IsNotEmpty({ message: 'Email cannot be empty' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;
}
