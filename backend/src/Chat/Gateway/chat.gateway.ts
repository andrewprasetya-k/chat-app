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
    origin: 'https://chat-app-fawn-one-16.vercel.app/', // Di production sebaiknya di-lock ke domain frontend
    pingTimeout: 60000 * 30, // 30 menit
    pingInterval: 25000,
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
      let token =
        client.handshake.auth.token || client.handshake.headers.authorization;

      if (!token && client.handshake.headers.cookie) {
        // Coba ambil token dari cookie jika tidak ada di header
        const cookies = client.handshake.headers.cookie.split(';');

        const tokenCookie = cookies.find((c) =>
          c.trim().startsWith('access_token='),
        );
        if (tokenCookie) {
          token = tokenCookie.split('=')[1];
        }
      }

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

      client.join(`user_${payload.sub}`); // Room untuk user ini
      console.log(`User ${payload.sub} joined room`);

      // Ambil data user untuk mendapatkan nama
      const user = await this.userService.findByIdForAuth(payload.sub);
      if (user) {
        client.data.userName = user.usr_nama_lengkap;
      }

      console.log(
        `Client connected: ${client.id} (User: ${payload.sub}, Name: ${client.data.userName})`,
      );

      // Supaya real-time sidebar jalan (untuk last message)
      const { data: userRooms } = await this.chatSharedService['supabase']
        .getClient()
        .from('chat_room_member')
        .select('crm_cr_id')
        .eq('crm_usr_id', payload.sub)
        .is('leave_at', null);

      if (userRooms) {
        userRooms.forEach((room) => {
          client.join(`room_${room.crm_cr_id}`);
        });
        console.log(
          `User ${payload.sub} auto-joined ${userRooms.length} rooms`,
        );
      }

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
        console.error(
          `Failed to update offline status for user ${userId}:`,
          err,
        );
      });

      this.server.emit('user_offline', {
        userId: userId,
        lastSeen: lastSeen,
      });
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
      userName: client.data.userName,
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
      userName: client.data.userName,
      roomId: roomId,
    });
  }
}
