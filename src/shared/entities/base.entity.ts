import { Expose } from 'class-transformer';

export class BaseEntity {
  @Expose({ name: 'created_at' })
  createdAt: string;

  @Expose({ name: 'updated_at' })
  updatedAt: string;
}
