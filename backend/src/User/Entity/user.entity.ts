import { Expose, Transform, Exclude } from 'class-transformer';
import { BaseEntity } from '../../shared/entities/base.entity';

export class UserEntity extends BaseEntity {
  @Expose()
  @Transform(({ obj }) => obj.usr_id, { toClassOnly: true })
  userId: string;

  @Expose()
  @Transform(({ obj }) => obj.usr_nama_lengkap, { toClassOnly: true })
  userFullName: string;

  @Expose()
  @Transform(({ obj }) => obj.usr_email, { toClassOnly: true })
  userEmail: string;

  @Expose()
  @Transform(({ obj }) => obj.usr_avatar, { toClassOnly: true })
  userAvatar: string;

  @Expose()
  @Transform(({ obj }) => obj.usr_role, { toClassOnly: true }) // Default value
  userRole?: string; // Optional with default

  @Exclude()
  password?: string;

  @Exclude()
  refreshToken?: string;
}
