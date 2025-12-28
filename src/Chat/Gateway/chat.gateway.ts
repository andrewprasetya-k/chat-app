import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatSharedService } from 'src/shared/chat-shared.service';
import { UserService } from 'src/User/Service/user.service';

@WebSocketGateway({
  cors: {
    origin: '*', // Di production sebaiknya di-lock ke domain frontend
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatSharedService: ChatSharedService,
    private readonly userService: UserService,
  ) {}

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
      const payload = this.jwtService.decode(cleanToken);

      if (!payload || !payload.sub) {
        client.disconnect();
        return;
      }

      // Simpan user ID di socket instance agar mudah diakses
      client.data.userId = payload.sub;
      console.log(`Client connected: ${client.id} (User: ${payload.sub})`);

      await this.userService.updateOnlineStatus(payload.sub, true);
      this.server.emit('user_online', { userId: payload.sub });
    } catch (e) {
      console.log('Connection rejected:', e.message);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    const userId = client.data.userId;
    if (userId) {
      const lastSeen = new Date().toISOString();
      // Kita tidak await di sini agar tidak memblokir event loop, tapi idealnya di-handle error-nya
      this.userService.updateOnlineStatus(userId, false).catch((err) => {
        console.error(`Failed to update offline status for user ${userId}:`, err);
      });

      this.server.emit('user_offline', { userId: userId, lastSeenAt: lastSeen });
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId;
      if (!userId) {
        throw new WsException('Unauthorized');
      }

      // Validasi Security: Cek apakah user benar-benar member room ini
      const isMember = await this.chatSharedService.isUserMemberOfRoom(
        roomId,
        userId,
      );

      if (!isMember) {
        console.warn(
          `Security Alert: User ${userId} tried to join room ${roomId} but is not a member.`,
        );
        // Jangan biarkan join, kirim error ke client
        throw new WsException('You are not a member of this room');
      }

      // Jika valid, baru boleh join
      client.join(`room_${roomId}`);
      console.log(`User ${userId} joined room_${roomId}`);
      return { event: 'joined_room', data: roomId };
    } catch (error) {
      // Return error structure to client
      return { event: 'error', data: error.message };
    }
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
