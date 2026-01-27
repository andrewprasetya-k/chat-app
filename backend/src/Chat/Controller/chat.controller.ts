import {
  Controller,
  Post,
  Body,
  UseGuards,
  Param,
  Patch,
  Get,
} from '@nestjs/common';
import { ChatService } from '../Service/chat.service';
import { SendMessageDto } from '../Dto/send-message.dto';
import { AuthGuard } from 'src/Auth/auth.guard';
import { User } from 'src/Auth/user.decorator';
import { RoomMemberGuard } from 'src/shared/guards/room-member.guard';
import { RoomActiveGuard } from 'src/shared/guards/room-active.guard';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('send/:roomId')
  @UseGuards(AuthGuard, RoomActiveGuard, RoomMemberGuard)
  async sendMessage(
    @Body() body: SendMessageDto,
    @Param('roomId') roomId: string,
    @User('sub') userId: string,
  ) {
    return await this.chatService.sendMessage(body, roomId, userId);
  }

  @Post('read/:roomId')
  @UseGuards(AuthGuard, RoomActiveGuard, RoomMemberGuard)
  async markAsRead(
    @Body('messageIds') messageIds: string[],
    @Param('roomId') roomId: string,
    @User('sub') userId: string,
  ) {
    return await this.chatService.markMessagesAsRead(roomId, messageIds, userId);
  }

  @Post('read-all/:roomId')
  @UseGuards(AuthGuard, RoomActiveGuard, RoomMemberGuard)
  async markAllAsRead(
    @Param('roomId') roomId: string,
    @User('sub') userId: string,
  ) {
    return await this.chatService.markRoomAsRead(roomId, userId);
  }

  @Get('unread-count/:roomId')
  @UseGuards(AuthGuard, RoomActiveGuard, RoomMemberGuard)
  async getUnreadCount(
    @User('sub') userId: string,
    @Param('roomId') roomId: string,
  ) {
    return await this.chatService.countUnreadMessages(roomId, userId);
  }

  @Patch('unsend/:roomId/:messageId')
  @UseGuards(AuthGuard, RoomActiveGuard, RoomMemberGuard)
  async unsendMessage(
    @Param('messageId') messageId: string,
    @Param('roomId') roomId: string,
    @User('sub') userId: string,
  ) {
    return await this.chatService.unsendMessage(roomId, messageId, userId);
  }

  @Get('search/:roomId/:query')
  @UseGuards(AuthGuard, RoomActiveGuard, RoomMemberGuard)
  async searchMessages(
    @Param('roomId') roomId: string,
    @Param('query') query: string,
    @User('sub') userId: string,
  ) {
    return await this.chatService.searchMessages(roomId, query, userId);
  }

  @Get('global-search/:query')
  @UseGuards(AuthGuard)
  async globalSearch(
    @Param('query') query: string,
    @User('sub') userId: string,
  ) {
    return await this.chatService.searchGlobalMessages(query, userId);
  }
}
