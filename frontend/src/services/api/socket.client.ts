import { io, Socket } from "socket.io-client";

class SocketClient {
  private socket: Socket | null = null;

  connect() {
    //cek apakah sudah connected
    if (this.socket?.connected) {
      return;
    }

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;
    if (!token) {
      console.warn("No access token found. Cannot connect to WebSocket.");
      return;
    }
    //inisialisasi koneksi socket.io
    this.socket = io(process.env.NEXT_PUBLIC_API_URL || "", {
      auth: {
        token: `Bearer ${token}`,
      },
      transports: ["websocket"],
      autoConnect: true,
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  //listener on
  on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  //listener off
  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event: string, data: any) {
    if (!this.socket) {
      return;
    }
    this.socket.emit(event, data);
  }
}
