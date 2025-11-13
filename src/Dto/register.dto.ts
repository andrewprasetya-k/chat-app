import { IsEmail, isNotEmpty, IsNotEmpty, IsString } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Username should not be empty' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: 'Password should not be empty' })
  password: string;
  
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email should not be empty' })
  email: string;

  @IsString()
  @IsNotEmpty({message: 'Contact should not be empty'})
  contact: string;
}