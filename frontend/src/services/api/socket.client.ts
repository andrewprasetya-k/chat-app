import { io, Socket } from "socket.io-client";

class SocketClient {
  private socket: Socket | null = null;

  //inisialisasi koneksi
  connect() {
    //cek apakah sudah connected
    if (this.socket?.connected) {
      return;
    }

    //inisialisasi koneksi socket.io
    // Tidak perlu ambil token dari localStorage karena pakai Cookie
    this.socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000", {
      withCredentials: true, // PENTING: Agar cookie dikirim saat handshake
      transports: ["websocket"],
      autoConnect: true,
    });

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id);
    });

    this.socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });
  }

  //putus koneksi
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    } else {
      console.warn("Socket is not connected. Cannot disconnect.");
    }
  }

  //untuk mendengarkan event
  on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    } else {
      console.warn("Socket is not connected. Cannot listen to event:", event);
    }
  }

  //untuk berhenti mendengarkan event
  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    } else {
      console.warn(
        "Socket is not connected. Cannot remove listener for event:",
        event
      );
    }
  }

  //untuk mengirim event
  emit(event: string, data: any) {
    if (!this.socket) {
      console.warn("Socket is not connected. Cannot emit event:", event);
      return;
    }
    this.socket.emit(event, data);
  }
}

export const socketClient = new SocketClient();
