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

  async getDeactivatedRooms(): Promise<ChatRoom[]> {
    const response = await api.get<ChatRoom[]>("/room/deactivated");
    return response.data;
  },

  async getRoomInfo(roomId: string): Promise<ChatRoomInfo> {
    const response = await api.get<ChatRoomInfo>(`/room/${roomId}`);
    return response.data;
  },

  // untuk mendapatkan pesan dalam chat room
  async getMessages(
    roomId: string,
    params?: MessageParams,
  ): Promise<ChatMessage[]> {
    const response = await api.get<{ messages: ChatMessage[] }>(
      `/room/messages/${roomId}`,
      {
        params,
      },
    );
    return response.data.messages;
  },

  // kirim chat
  async sendMessage(
    roomId: string,
    text: string,
    replyTo?: string,
  ): Promise<ChatMessage> {
    const payload = { text, replyTo };
    const response = await api.post<ChatMessage>(
      `/chat/send/${roomId}`,
      payload,
    );
    return response.data;
  },

  // mark as read chat
  async markAsRead(roomId: string, messageIds: string[]): Promise<void> {
    if (messageIds.length === 0) return;
    await api.post(`/chat/read/${roomId}`, { messageIds });
  },

  async markAllAsRead(roomId: string): Promise<void> {
    await api.post(`/chat/read-all/${roomId}`);
  },

  // --- 5. Global Search ---
  async globalSearchQuery(query: string): Promise<GlobalSearchResults> {
    const response = await api.get<GlobalSearchResults>(
      `/search/${encodeURIComponent(query)}`,
    );
    return response.data;
  },

  //unsend chat message
  async unsendMessage(messageId: string, chatRoomId: string): Promise<void> {
    await api.patch(`/chat/unsend/${chatRoomId}/${messageId}`);
  },

  // mencari user berdasarkan nama
  async globalSearchUser(query: string): Promise<User[]> {
    const response = await api.get<User[]>(`user/search/name/${query}`);
    return response.data;
  },

  // membuat personal chat baru
  async createPersonalChat(targetUserId: string): Promise<ChatRoom> {
    const payload = {
      groupName: "",
      isGroup: false,
      groupMembers: [targetUserId],
    };
    const response = await api.post<ChatRoom>(`/room/create`, payload);
    return response.data;
  },

  // membuat grup chat baru
  async createGroupChat(
    groupName: string,
    groupMembers: string[],
  ): Promise<ChatRoom> {
    const payload = {
      groupName,
      isGroup: true,
      groupMembers,
    };
    const response = await api.post<ChatRoom>(`/room/create`, payload);
    return response.data;
  },

  async leaveGroup(roomId: string): Promise<void> {
    await api.post(`/room/leave/${roomId}`);
  },

  async deleteGroup(roomId: string): Promise<void> {
    await api.delete(`/room/${roomId}`);
  },

  async addMembers(roomId: string, members: string[]): Promise<void> {
    await api.post(`/room/add-members/${roomId}`, { members });
  },

  async removeMembers(roomId: string, members: string[]): Promise<void> {
    await api.post(`/room/remove-members/${roomId}`, { members });
  },

  async promoteMember(roomId: string, userId: string): Promise<void> {
    await api.post(`/room/promote/${roomId}/${userId}`);
  },

  async demoteMember(roomId: string, userId: string): Promise<void> {
    await api.post(`/room/demote/${roomId}/${userId}`);
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
