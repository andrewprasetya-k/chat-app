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
  lastMessageId?: string | null;
  lastMessage: string | null;
  lastMessageTime: string | null;
  senderId: string | null;
  senderName: string | null;
  isLastMessageRead: boolean;
  unreadCount?: number;
  lastMessageType?: string;
  isOnline?: boolean;
  lastSeen?: string | null;
  otherUserId?: string | null;
  otherUserEmail?: string | null;
  memberCount?: number;
  deletedAt?: string | null;
  leaveAt?: string | null;
  isDeactivated?: boolean;
}

// --- 2a. Chat Room Details ---
// Sesuai dengan ChatRoomInfo di backend
export interface RoomMemberInfo {
  userId: string;
  name: string;
  email: string;
  role: "admin" | "member" | "personal";
  joinedAt: string;
  leftAt: string | null;
  isMe: boolean;
}

export interface ChatRoomInfo {
  roomId: string;
  roomName: string;
  isGroup: boolean;
  createdAt: string;
  totalMembers: number;
  activeMembers: RoomMemberInfo[];
  pastMembers: RoomMemberInfo[];
}

// --- 3. Chat Message ---
// Sesuai dengan MessageDetailEntity di backend
export interface ChatMessage {
  textId: string;
  roomId: string;
  roomName?: string;
  text: string;
  type: string;
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

// Payload untuk event "read_receipt"
export interface ReadReceiptPayload {
  roomId: string;
  readerId: string;
  messageIds: string[];
  readAt: string;
}

// --- 6. Search Results ---
export interface GlobalSearchResults {
  rooms: ChatRoom[];
  messages: ChatMessage[];
  users: User[];
}
