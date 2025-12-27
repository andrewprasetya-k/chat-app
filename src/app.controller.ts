/**
 * AppController
 * ----------------
 * Simple root controller used by the application. Provides a single
 * health / hello endpoint handled by `AppService`.
 *
 * Routes:
 * - GET /      -> returns application greeting
 */
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { ChatRoomService } from './ChatRoom/Service/chat-room.service';
import { AuthGuard } from './Auth/auth.guard';
import { User } from './Auth/user.decorator';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly chatRoomService: ChatRoomService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('search/:query')
  @UseGuards(AuthGuard)
  async globalSearch(@Param('query') query: string, @User('sub') userId: string) {
    return this.chatRoomService.searchRooms(userId, query);
  }
}
