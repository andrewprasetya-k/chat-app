import { Expose, Transform, Type } from 'class-transformer';
import { BaseEntity } from './base.entity';
import { UserEntity } from './user.entity';

export class ChatMessageEntity extends BaseEntity {
  @Expose()
  @Transform(({ obj }) => obj.cm_id)
  id: string;

  @Expose()
  @Transform(({ obj }) => obj.message_text)
  text: string;

  @Expose()
  @Transform(({ obj }) => obj.cm_cr_id)
  roomId: string;

  @Expose()
  @Type(() => UserEntity)
  @Transform(({ obj }) => {
    const sender = Array.isArray(obj.sender) ? obj.sender[0] : obj.sender;
    return sender;
  })
  sender: UserEntity;

  @Expose()
  @Type(() => ReadReceiptEntity)
  @Transform(({ obj }) => obj.read_receipts || [])
  readReceipts: ReadReceiptEntity[];
}

export class ReadReceiptEntity {
  @Expose()
  @Transform(({ obj }) => obj.read_at)
  readAt: string;

  @Expose()
  @Type(() => UserEntity)
  @Transform(({ obj }) => {
    const reader = Array.isArray(obj.reader) ? obj.reader[0] : obj.reader;
    return reader;
  })
  reader: UserEntity;
}
