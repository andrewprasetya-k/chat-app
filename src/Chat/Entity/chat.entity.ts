import { Expose, Type, Transform } from 'class-transformer';
import { BaseEntity } from '../../shared/entities/base.entity';
import { UserEntity } from '../../User/Entity/user.entity';

export class ChatMessageEntity extends BaseEntity {
  @Expose()
  @Transform(({ obj }) => obj.cm_id, { toClassOnly: true })
  id: string;

  @Expose()
  @Transform(({ obj }) => obj.message_text, { toClassOnly: true })
  text: string;

  @Expose()
  @Transform(({ obj }) => obj.cm_cr_id, { toClassOnly: true })
  roomId: string;

  @Expose()
  @Type(() => UserEntity)
  sender: UserEntity;

  @Expose()
  @Transform(({ obj }) => obj.read_receipts, { toClassOnly: true })
  @Type(() => ReadReceiptEntity)
  readReceipts: ReadReceiptEntity[];
}

export class ReadReceiptEntity {
  @Expose()
  @Transform(({ obj }) => obj.read_at, { toClassOnly: true })
  readAt: string;

  @Expose()
  @Type(() => UserEntity)
  reader: UserEntity;
}
