import { Expose, Transform } from 'class-transformer';

export class BaseEntity {
  @Expose()
  @Transform(({ obj }) => {
    const val = obj.created_at;
    if (!val) return undefined;
    // Force UTC interpretation for timestamp without timezone
    if (typeof val === 'string' && !val.endsWith('Z') && !val.includes('+')) {
      return new Date(val + 'Z').toISOString();
    }
    return new Date(val).toISOString();
  })
  createdAt?: string;

  @Expose()
  @Transform(({ obj }) => {
    const val = obj.updated_at;
    if (!val) return undefined;
    if (typeof val === 'string' && !val.endsWith('Z') && !val.includes('+')) {
      return new Date(val + 'Z').toISOString();
    }
    return new Date(val).toISOString();
  })
  updatedAt?: string;

  @Expose()
  @Transform(({ obj }) => {
    const val = obj.deleted_at;
    if (!val) return null;
    if (typeof val === 'string' && !val.endsWith('Z') && !val.includes('+')) {
      return new Date(val + 'Z').toISOString();
    }
    return new Date(val).toISOString();
  })
  deletedAt?: string | null;
}
