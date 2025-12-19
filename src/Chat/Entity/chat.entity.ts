import { Expose, Type } from 'class-transformer';
import { BaseEntity } from '../../shared/entities/base.entity';
import { UserEntity } from '../../User/Entity/user.entity';

export class ChatMessageEntity extends BaseEntity {
  @Expose({ name: 'cm_id' })
  id: string;

  @Expose({ name: 'message_text' })
  text: string;

  @Expose({ name: 'cm_cr_id' })
  roomId: string;

  @Expose()
  @Type(() => UserEntity)
  sender: UserEntity;

  @Expose({ name: 'read_receipts' })
  @Type(() => ReadReceiptEntity)
  readReceipts: ReadReceiptEntity[];
}

export class ReadReceiptEntity {
  @Expose({ name: 'read_at' })
  readAt: string;

  @Expose()
  @Type(() => UserEntity)
  reader: UserEntity;
}
