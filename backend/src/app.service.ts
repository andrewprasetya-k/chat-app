/**
 * AppService
 * ----------
 * Small service that backs `AppController` and provides a single
 * `getHello()` helper used by the root endpoint. Kept intentionally
 * minimal as part of the NestJS scaffold.
 */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ChatRoomService } from './ChatRoom/Service/chat-room.service';
import { UserService } from './User/Service/user.service';
import { plainToInstance } from 'class-transformer';
import { SearchResponseEntity } from './ChatRoom/Entity/chat-room.entity';

@Injectable()
export class AppService {
  constructor(
    private readonly chatRoomService: ChatRoomService,
    private readonly userService: UserService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async globalSearch(userId: string, query: string) {
    try {
      const activeRoomsPromise = this.chatRoomService.getActiveRooms(userId);
      const deactivatedRoomsPromise =
        this.chatRoomService.getDeactivatedRooms(userId);
      const usersPromise = this.userService.findByFullName(query);
      const messagesPromise = this.chatRoomService.searchMessages(
        userId,
        query,
      );

      const [activeRooms, deactivatedRooms, users, messages] =
        await Promise.all([
          activeRoomsPromise,
          deactivatedRoomsPromise,
          usersPromise,
          messagesPromise,
        ]);

      const allRooms = [...activeRooms, ...deactivatedRooms];

      const lowerQuery = query.toLowerCase();

      const filteredRooms = allRooms.filter((room) =>
        room.roomName?.toLowerCase().includes(lowerQuery),
      );

      const filteredUsers = users.filter((u) => u.id !== userId);

      return {
        rooms: filteredRooms,
        messages: messages,
        users: filteredUsers,
      };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to search',
      );
    }
  }
}
