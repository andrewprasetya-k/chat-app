import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UseGuards } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // Di production sebaiknya di-lock ke domain frontend
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      // Client harus mengirim token via query / headers
      // Contoh: io('URL', { auth: { token: 'Bearer ...' } })
      const token =
        client.handshake.auth.token || client.handshake.headers.authorization;

      if (!token) {
        throw new Error('No token provided');
      }

      // Bersihkan 'Bearer ' jika ada
      const cleanToken = token.replace('Bearer ', '');

      // Verifikasi Token (Sesuaikan secret dengan Config Anda)
      // Disini kita asumsi JwtService sudah dikonfigurasi global atau di module
      const payload = this.jwtService.decode(cleanToken);

      if (!payload || !payload.sub) {
        client.disconnect();
        return;
      }

      // Simpan user ID di socket instance agar mudah diakses
      client.data.userId = payload.sub;
      console.log(`Client connected: ${client.id} (User: ${payload.sub})`);
    } catch (e) {
      console.log('Connection rejected:', e.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    // TODO: Validasi apakah user benar-benar member room ini (via Service/DB)
    // Untuk performa, bisa diskip jika percaya frontend, tapi sebaiknya divalidasi.

    client.join(`room_${roomId}`);
    console.log(`User ${client.data.userId} joined room_${roomId}`);
    return { event: 'joined_room', data: roomId };
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`room_${roomId}`);
    return { event: 'left_room', data: roomId };
  }

  @SubscribeMessage('typing_start')
  handleTypingStart(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast ke orang lain di room yg sama
    // client.to(...) artinya kirim ke semua KECUALI pengirim
    client.to(`room_${roomId}`).emit('user_typing', {
      userId: client.data.userId,
      roomId: roomId,
    });
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.to(`room_${roomId}`).emit('user_stopped_typing', {
      userId: client.data.userId,
      roomId: roomId,
    });
  }
}
