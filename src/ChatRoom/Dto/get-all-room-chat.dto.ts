export class getAllRoomChatDto {
  roomId: string;
  roomName: string;
  isGroup: boolean;
  lastMessage: string | null;
  lastMessageTime: string | null;
  senderId: string | null;
  senderName: string | null;
  isLastMessageRead: boolean;
}
