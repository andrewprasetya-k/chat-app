export class GetDetailedRoomChatDto {
  roomName: string;
  stillInChat: boolean;
  messages: ChatMessageDto[];
}

export class ChatMessageDto {
  textId: string;
  text: string;
  createdAt: string;
  sender: SenderDto | null;
  readBy: ReadByDto[];
}

export class SenderDto {
  senderId: string;
  senderName: string;
}

export class ReadByDto {
  userId: string;
  userName: string;
}
