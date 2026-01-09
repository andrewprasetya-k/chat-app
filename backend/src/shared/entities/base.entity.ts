import { Expose, Transform } from 'class-transformer';

export class BaseEntity {
  @Expose()
  @Transform(({ obj }) =>
    obj.created_at ? new Date(obj.created_at).toISOString() : undefined,
  )
  createdAt?: string;

  @Expose()
  @Transform(({ obj }) =>
    obj.updated_at ? new Date(obj.updated_at).toISOString() : undefined,
  )
  updatedAt?: string;

  @Expose()
  @Transform(({ obj }) =>
    obj.deleted_at ? new Date(obj.deleted_at).toISOString() : null,
  )
  deletedAt?: string | null;
}
