import api from "../api/axios.instance";
import { socketClient } from "../api/socket.client";
import {
  ChatRoom,
  ChatMessage,
  MessageParams,
  ChatRoomInfo,
  User,
  GlobalSearchResults,
} from "../types";

export const chatService = {
  // untuk mendapatkan daftar ruang chat aktif
  async getActiveRooms(): Promise<ChatRoom[]> {
    const response = await api.get<ChatRoom[]>("/room/active");
    return response.data;
  },

  async getRoomInfo(roomId: string): Promise<ChatRoomInfo> {
    const response = await api.get<ChatRoomInfo>(`/room/${roomId}`);
    return response.data;
  },

  // untuk mendapatkan pesan dalam chat room
  async getMessages(
    roomId: string,
    params?: MessageParams
  ): Promise<ChatMessage[]> {
    const response = await api.get<{ messages: ChatMessage[] }>(
      `/room/messages/${roomId}`,
      {
        params,
      }
    );
    return response.data.messages;
  },

  // kirim chat
  async sendMessage(
    roomId: string,
    text: string,
    replyTo?: string
  ): Promise<ChatMessage> {
    const payload = { text, replyTo };
    const response = await api.post<ChatMessage>(
      `/chat/send/${roomId}`,
      payload
    );
    return response.data;
  },

  // mark as read chat
  async markAsRead(roomId: string, messageIds: string[]): Promise<void> {
    if (messageIds.length === 0) return;
    await api.post(`/chat/read/${roomId}`, { messageIds });
  },

  async globalSearchQuery(query: string): Promise<GlobalSearchResults> {
    const response = await api.get<GlobalSearchResults>(
      `/search/${encodeURIComponent(query)}`
    );
    return response.data;
  },

  async globalSearchUser(query: string): Promise<User[]> {
    const response = await api.get<User[]>(`user/search/name/${query}`);
    return response.data;
  },

  async createPersonalChat(targetUserId: string): Promise<ChatRoom> {
    const payload = {
      groupName: "",
      isGroup: false,
      groupMembers: [targetUserId],
    };
    const response = await api.post<ChatRoom>(`/room/create`, payload);
    return response.data;
  },

  // == web socket ==
  // tandai masuk ke room tertentu (backend expect string roomId)
  joinRoom(roomId: string) {
    socketClient.emit("join_room", roomId);
  },

  // tandai keluar room (backend expect string roomId)
  leaveRoom(roomId: string) {
    socketClient.emit("leave_room", roomId);
  },

  // kirim event typing (backend event: typing_start)
  sendTypingEvent(roomId: string) {
    socketClient.emit("typing_start", roomId);
  },

  // kirim event stop typing (backend event: typing_stop)
  sendStopTypingEvent(roomId: string) {
    socketClient.emit("typing_stop", roomId);
  },
};
