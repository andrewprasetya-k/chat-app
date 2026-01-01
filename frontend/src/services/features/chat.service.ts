import api from "../api/axios.instance";
import { socketClient } from "../api/socket.client";
import { ChatRoom, ChatMessage, MessageParams } from "../types";

export const chatService = {
  //untuk mendapatkan daftar ruang chat aktif
  async getActiveRooms(): Promise<ChatRoom[]> {
    const response = await api.get<ChatRoom[]>("/room/active");
    return response.data;
  },

  //untuk mendapatkan pesan dalam chat room
  async getMessages(
    roomId: string,
    params?: MessageParams
  ): Promise<ChatMessage[]> {
    const response = await api.get<ChatMessage[]>(`room/messages/${roomId}`, {
      params,
    });
    return response.data;
  },

  //kirim chat
  async sendMessage(
    roomId: string,
    text: string,
    replyToId?: string
  ): Promise<ChatMessage> {
    const payload = { text, replyToId };
    const response = await api.post<ChatMessage>(
      `/chat/send/${roomId}`,
      payload
    );
    return response.data;
  },

  //mark as read chat
  async markAsRead(roomId: string, messageIds: string[]): Promise<void> {
    if (messageIds.length === 0) return;
    await api.post(`/chat/read/${roomId}`, { roomId, messageIds });
  },

  //==web socket==
  //tandai masuk ke room tertentu
  joinRoom(roomId: string) {
    socketClient.emit("joinRoom", { roomId });
  },

  //tandai ada yang keluar room supaya tidak terima notif
  leaveRoom(roomId: string) {
    socketClient.emit("leaveRoom", { roomId });
  },

  //kirim event typing
  sendTypingEvent(roomId: string) {
    socketClient.emit("typing", { roomId });
  },

  //kirim event stop typing
  sendStopTypingEvent(roomId: string) {
    socketClient.emit("stopTyping", { roomId });
  },
};
