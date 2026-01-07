import { io, Socket } from "socket.io-client";

class SocketClient {
  private socket: Socket = io(
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
    {
      withCredentials: true, // PENTING: Agar cookie dikirim saat handshake
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    }
  );

  //inisialisasi koneksi socket.io
  constructor() {
    this.socket.on("connect", () => {
      console.log("Socket connected with ID:", this.socket.id);
    });
  }

  //inisialisasi koneksi
  connect() {
    //cek apakah sudah connected
    if (!this.socket.connected) {
      this.socket.connect();
      console.log("Socket connecting...");
    } else {
      console.warn("Socket is already connected.");
    }
  }

  //putus koneksi
  disconnect() {
    if (this.socket && this.socket.connected) {
      this.socket.disconnect();
      console.log("Socket disconnected");
    } else {
      console.warn("Socket is not connected. Cannot disconnect.");
    }
  }

  //untuk mendengarkan event
  on(event: string, callback: (...args: any[]) => void) {
    this.socket.on(event, callback);
  }

  //untuk berhenti mendengarkan event
  off(event: string, callback?: (...args: any[]) => void) {
    this.socket.off(event, callback);
  }

  //untuk mengirim event
  emit(event: string, data: any) {
    this.socket.emit(event, data);
  }
}

export const socketClient = new SocketClient();
