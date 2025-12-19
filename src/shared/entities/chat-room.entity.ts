import { Expose, Transform, Type } from 'class-transformer';
import { BaseEntity } from './base.entity';
import { UserEntity } from './user.entity';
import { ChatMessageEntity } from './chat-message.entity';

export class ChatRoomEntity extends BaseEntity {
  @Expose()
  @Transform(({ obj }) => obj.cr_id)
  id: string;

  @Expose()
  @Transform(({ obj }) => obj.cr_name)
  name: string;

  @Expose()
  @Transform(({ obj }) => obj.cr_is_group)
  isGroup: boolean;

  @Expose()
  @Type(() => ChatRoomMemberEntity)
  @Transform(({ obj }) => obj.members || [])
  members: ChatRoomMemberEntity[];

  @Expose()
  @Type(() => ChatMessageEntity)
  @Transform(({ obj }) => obj.messages || [])
  messages: ChatMessageEntity[];
}

export class ChatRoomMemberEntity {
  @Expose()
  @Transform(({ obj }) => obj.crm_id)
  id: string;

  @Expose()
  @Transform(({ obj }) => obj.crm_is_admin)
  isAdmin: boolean;

  @Expose()
  @Transform(({ obj }) => obj.left_at)
  leftAt: string;

  @Expose()
  @Type(() => UserEntity)
  @Transform(({ obj }) => {
    const user = Array.isArray(obj.user) ? obj.user[0] : obj.user;
    return user;
  })
  user: UserEntity;
}
