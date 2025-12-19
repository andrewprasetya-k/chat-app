import { Expose, Exclude } from 'class-transformer';
import { BaseEntity } from './base.entity';

export class UserEntity extends BaseEntity {
  @Expose({ name: 'usr_id' })
  id: string;

  @Expose({ name: 'usr_nama_lengkap' })
  fullName: string;

  @Expose({ name: 'usr_email' })
  email: string;

  @Expose({ name: 'usr_role' })
  role: string;

  @Exclude()
  password: string;
}
