import { Expose, Transform, Exclude } from 'class-transformer';
import { BaseEntity } from './base.entity';

export class UserEntity extends BaseEntity {
  @Expose()
  @Transform(({ obj }) => obj.usr_id, { toClassOnly: true })
  id: string;

  @Expose()
  @Transform(({ obj }) => obj.usr_nama_lengkap, { toClassOnly: true })
  fullName: string;

  @Expose()
  @Transform(({ obj }) => obj.usr_email, { toClassOnly: true })
  email: string;

  @Expose()
  @Transform(({ obj }) => obj.usr_role, { toClassOnly: true }) // Default value
  role?: string; // Optional with default

  @Exclude()
  password?: string;
}
