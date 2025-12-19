import { Expose, Type } from 'class-transformer';
import { BaseEntity } from './base.entity';
import { UserEntity } from './user.entity';
import { ChatMessageEntity } from './chat-message.entity';

export class ChatRoomEntity extends BaseEntity {
  @Expose({ name: 'cr_id' })
  id: string;

  @Expose({ name: 'cr_name' })
  name: string;

  @Expose({ name: 'cr_is_group' })
  isGroup: boolean;

  @Expose()
  @Type(() => ChatRoomMemberEntity)
  members: ChatRoomMemberEntity[];

  @Expose()
  @Type(() => ChatMessageEntity)
  messages: ChatMessageEntity[];
}

export class ChatRoomMemberEntity {
  @Expose({ name: 'crm_id' })
  id: string;

  @Expose({ name: 'crm_is_admin' })
  isAdmin: boolean;

  @Expose({ name: 'left_at' })
  leftAt: string;

  @Expose()
  @Type(() => UserEntity)
  user: UserEntity;
}
