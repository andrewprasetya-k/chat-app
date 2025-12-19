import { Expose, Transform } from 'class-transformer';

export class BaseEntity {
  @Expose()
  @Transform(({ obj }) => obj.created_at)
  createdAt: string;

  @Expose()
  @Transform(({ obj }) => obj.updated_at)
  updatedAt: string;
}
