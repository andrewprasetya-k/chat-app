import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Username should not be empty' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: 'Password should not be empty' })
  password: string;
}


