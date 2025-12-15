import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsIn,
  IsISO8601,
} from 'class-validator';

export class EditUserDto {
  @IsOptional()
  @IsString()
  fullName: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;
}
