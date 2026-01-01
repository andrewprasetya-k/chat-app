//struktur user
export interface User {
  id: number;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
  lastSeenAt?: string;
}

//struktur chat room
export interface ChatRoom {
  id: string;
  groupName?: string;
  isGroup: boolean;
  groupIcon?: string | null;
  members: User[];
  lastMessage?: {
    id: string;
    text: string;
    createdAt: string;
    senderName: string;
  };
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

//struktur chat
export interface ChatMessage {
  id: string;
  text: string;
  createdAt: string;
  sender: User;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  } | null;
  readBy?: string[];
}

//response saat login/register
export interface AuthResponse {
  accessToken: string;
  user: User;
}

//parameter pagianation
export interface MessageParams {
  limit?: number;
  beforeAt?: string;
}

// Data yang diterima saat event 'user_typing'
export interface TypingPayload {
  userId: string;
  roomId: string;
}

//data yang diterima saat event 'message_read_update'
export interface ReadReceiptPayload {
  roomId: string;
  readerId: string;
  messageIds: string[];
  readAt: string;
}
