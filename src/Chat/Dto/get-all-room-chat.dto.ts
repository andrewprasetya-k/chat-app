export class getAllRoomChatDto {
  roomId: string;
  roomName: string;
  isGroup: boolean;
  lastMessage: string;
  lastMessageTime: Date;
  isLastMessageRead: boolean;
  senderId: string;
  senderName: string;
}
