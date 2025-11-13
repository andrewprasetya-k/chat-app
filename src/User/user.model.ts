import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class UserModel {
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
  @IsNotEmpty({ message: 'Contact should not be empty' })
  contact: string;
  /**
   * UserModel (domain model)
   * ------------------------
   * Represents the shape of a user in the application. This file currently
   * mirrors the DTO validation shape, but if you switch to a DB-backed model
   * (e.g. Supabase / TypeORM) you might replace this with an entity or
   * a TypeScript interface describing persisted columns.
   */
}