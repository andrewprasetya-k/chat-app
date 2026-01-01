// --- 1. User & Profile ---
// Sesuai dengan UserEntity di backend
export interface User {
  id: string; // UUID dari backend (usr_id)
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  role?: string;
}

// --- 2. Chat Room (List/Inbox) ---
// Sesuai dengan ChatRoomListEntity di backend
export interface ChatRoom {
  roomId: string;
  roomName: string;
  isGroup: boolean;
  lastMessage: string | null;
  lastMessageTime: string | null;
  senderId: string | null;
  senderName: string | null;
  isLastMessageRead: boolean;
  unreadCount?: number;
}

// --- 3. Chat Message ---
// Sesuai dengan MessageDetailEntity di backend
export interface ChatMessage {
  textId: string; // Backend menggunakan textId sebagai primary identifier pesan
  text: string;
  createdAt: string;
  sender: {
    senderId: string;
    senderName: string;
  } | null;
  replyTo: {
    id: string;
    text: string;
    senderName: string;
  } | null;
  readBy: {
    userId: string;
    userName: string;
  }[];
}

// --- 4. Auth & API Responses ---
export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface MessageParams {
  limit?: number;
  beforeAt?: string;
}

// --- 5. WebSocket Event Payloads ---
export interface TypingPayload {
  userId: string;
  roomId: string;
}

export interface ReadReceiptPayload {
  roomId: string;
  readerId: string;
  messageIds: string[];
  readAt: string;
}