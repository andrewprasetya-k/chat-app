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
    origin: process.env.NEXT_PUBLIC_API_URL,
    pingTimeout: 60000 * 30,
    pingInterval: 25000,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatSharedService: ChatSharedService,
    private readonly userService: UserService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      let token =
        client.handshake.auth.token || client.handshake.headers.authorization;
      if (!token && client.handshake.headers.cookie) {
        const cookies = client.handshake.headers.cookie.split(';');
        const tokenCookie = cookies.find((c) =>
          c.trim().startsWith('access_token='),
        );
        if (tokenCookie) token = tokenCookie.split('=')[1];
      }
      if (!token) throw new Error('No token provided');

      const cleanToken = token.replace('Bearer ', '');
      const payload = this.jwtService.decode(cleanToken);
      if (!payload || !payload.sub) {
        client.disconnect();
        return;
      }

      client.data.userId = payload.sub;
      client.join(`user_${payload.sub}`);

      const user = await this.userService.findByIdForAuth(payload.sub);
      if (user) client.data.userName = user.usr_nama_lengkap;

      const roomIds = await this.chatSharedService.getUserActiveRoomIds(
        payload.sub,
      );
      if (roomIds.length > 0) {
        const socketRoomIds = roomIds.map((id) => `room_${id}`);
        client.join(socketRoomIds);
      }

      await this.userService.updateOnlineStatus(payload.sub, true);
      this.server.emit('user_online', { userId: payload.sub });
    } catch (e) {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const lastSeen = new Date().toISOString();
      this.userService.updateOnlineStatus(userId, false).catch(() => {});
      this.server.emit('user_offline', { userId, lastSeen });
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId;
      if (!userId) throw new WsException('Unauthorized');
      if (!(await this.chatSharedService.isUserMemberOfRoom(roomId, userId)))
        throw new WsException('Not a member');
      client.join(`room_${roomId}`);
      return { event: 'joined_room', data: roomId };
    } catch (error) {
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
    client.to(`room_${roomId}`).emit('user_typing', {
      userId: client.data.userId,
      userName: client.data.userName,
      roomId,
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
      roomId,
    });
  }
}
