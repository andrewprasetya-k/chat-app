import { io, Socket } from "socket.io-client";

class SocketClient {
  private socket: Socket | null = null;

  //inisialisasi koneksi
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
