export class RoomMemberDto {
  userId: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'personal';
  joinedAt: string;
  leftAt: string | null;
  isMe: boolean;
}

export class GetRoomInfoDto {
  roomId: string;
  roomName: string;
  isGroup: boolean;
  createdAt: string;
  totalMembers: number;
  activeMembers: RoomMemberDto[];
  pastMembers: RoomMemberDto[];
}