import { Expose, Transform, Type } from 'class-transformer';
import { BaseEntity } from '../../shared/entities/base.entity';
import { UserEntity } from '../../User/Entity/user.entity';
import { ChatMessageEntity } from '../../Chat/Entity/chat.entity';

// --- 1. LIST ROOMS Entity ---
export class ChatRoomListEntity {
  @Expose()
  roomId: string;

  @Expose()
  roomName: string;

  @Expose()
  isGroup: boolean;

  @Expose()
  deletedAt: string | null; // Added field

  @Expose()
  lastMessage: string | null;

  @Expose()
  lastMessageTime: string | null;

  @Expose()
  senderId: string | null;

  @Expose()
  senderName: string | null;

  @Expose()
  isLastMessageRead: boolean;
}

// --- 2. MESSAGES IN ROOM Entity ---
export class ChatRoomMessagesEntity {
  @Expose()
  roomName: string;

  @Expose()
  stillInRoom: boolean;

  @Expose()
  @Type(() => MessageDetailEntity)
  messages: MessageDetailEntity[];
}

export class MessageDetailEntity {
  @Expose()
  textId: string;

  @Expose()
  text: string;

  @Expose()
  createdAt: string;

  @Expose()
  @Type(() => SenderEntity)
  sender: SenderEntity | null;

  @Expose()
  @Type(() => ReplyInfoEntity)
  replyTo: ReplyInfoEntity | null;

  @Expose()
  @Type(() => ReadByEntity)
  readBy: ReadByEntity[];
}

export class ReplyInfoEntity {
  @Expose()
  id: string;

  @Expose()
  text: string;

  @Expose()
  senderName: string;
}

export class SenderEntity {
  @Expose()
  senderId: string;

  @Expose()
  senderName: string;
}

export class ReadByEntity {
  @Expose()
  userId: string;

  @Expose()
  userName: string;
}

// --- 3. ROOM INFO Entity ---
export class ChatRoomInfoEntity {
  @Expose()
  roomId: string;

  @Expose()
  roomName: string;

  @Expose()
  isGroup: boolean;

  @Expose()
  createdAt: string;

  @Expose()
  deletedAt: string | null; // Added field

  @Expose()
  totalMembers: number;

  @Expose()
  @Type(() => RoomMemberInfoEntity)
  activeMembers: RoomMemberInfoEntity[];

  @Expose()
  @Type(() => RoomMemberInfoEntity)
  pastMembers: RoomMemberInfoEntity[];
}

export class RoomMemberInfoEntity {
  @Expose()
  userId: string;

  @Expose()
  name: string;

  @Expose()
  email: string;

  @Expose()
  role: 'admin' | 'member' | 'personal';

  @Expose()
  joinedAt: string;

  @Expose()
  leftAt: string | null;

  @Expose()
  isMe: boolean;
}

// --- 4. ACTION RESPONSES ---
export class CreateRoomResponseEntity {
  @Expose()
  success: boolean;

  @Expose()
  roomId: string;

  @Expose()
  message?: string;
}

export class MemberActionResponseEntity {
  @Expose()
  success: boolean;

  @Expose()
  message: string;

  @Expose()
  @Type(() => MemberSimpleEntity)
  members: MemberSimpleEntity[];
}

export class MemberSimpleEntity {
  @Expose()
  memberName: string;
}

export class BasicActionResponseEntity {
  @Expose()
  success: boolean;

  @Expose()
  message: string;

  @Expose()
  now?: string; // Optional, used in leaveRoom
}

// --- 5. DB MAPPING ENTITIES (Internal use / Raw mapping) ---
// Note: kept if needed for deep nested transformations, but strictly speaking
// the service now constructs the response objects manually before plainToInstance.
export class ChatRoomEntity extends BaseEntity {
  @Expose({ name: 'cr_id' })
  id: string;

  @Expose({ name: 'cr_name' })
  name: string;

  @Expose({ name: 'cr_is_group' })
  isGroup: boolean;

  @Expose()
  @Transform(({ obj }) => obj.cr_avatar, { toClassOnly: true })
  groupAvatar: string;

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

export class SearchMessageEntity {
  @Expose()
  messageId: string;

  @Expose()
  text: string;

  @Expose()
  createdAt: string;

  @Expose()
  roomId: string;

  @Expose()
  roomName: string;

  @Expose()
  isGroup: boolean;

  @Expose()
  senderId: string;

  @Expose()
  senderName: string;
}

export class SearchResponseEntity {
  @Expose()
  @Type(() => ChatRoomListEntity)
  rooms: ChatRoomListEntity[];

  @Expose()
  @Type(() => UserEntity)
  users: UserEntity[];

  @Expose()
  @Type(() => SearchMessageEntity)
  messages: SearchMessageEntity[];
}
