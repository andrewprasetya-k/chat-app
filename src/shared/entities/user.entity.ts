import { Expose, Transform, Exclude } from 'class-transformer';
import { BaseEntity } from './base.entity';

export class UserEntity extends BaseEntity {
  @Expose()
  @Transform(({ obj }) => obj.usr_id)
  id: string;

  @Expose()
  @Transform(({ obj }) => obj.usr_nama_lengkap)
  fullName: string;

  @Expose()
  @Transform(({ obj }) => obj.usr_email)
  email: string;

  @Expose()
  @Transform(({ obj }) => obj.usr_role)
  role: string;

  @Exclude()
  password: string;
}
