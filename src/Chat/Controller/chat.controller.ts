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

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('send/:roomId')
  @UseGuards(AuthGuard)
  sendMessage(
    @Body() body: SendMessageDto,
    @Param('roomId') roomId: string,
    @User('sub') userId: string,
  ) {
    return this.chatService.sendMessage(body, roomId, userId);
  }

  @Post('read/:roomId/:messageId')
  @UseGuards(AuthGuard)
  markAsRead(
    @Param('messageId') messageId: string,
    @Param('roomId') roomId: string,
    @User('sub') userId: string,
  ) {
    return this.chatService.markMessageAsRead(roomId, messageId, userId);
  }

  @Get('unread-count/:roomId')
  @UseGuards(AuthGuard)
  getUnreadCount(
    @User('sub') userId: string,
    @Param('roomId') roomId: string,
  ) {
    return this.chatService.countUnreadMessages(roomId, userId);
  }

  @Patch('unsend/:roomId/:messageId')
  @UseGuards(AuthGuard)
  unsendMessage(
    @Param('messageId') messageId: string,
    @Param('roomId') roomId: string,
    @User('sub') userId: string,
  ) {
    return this.chatService.unsendMessage(roomId, messageId, userId);
  }

  @Get('search/:roomId/:query')
  @UseGuards(AuthGuard)
  searchMessages(
    @Param('roomId') roomId: string,
    @Param('query') query: string,
    @User('sub') userId: string,
  ) {
    return this.chatService.searchMessages(roomId, query, userId);
  }
}
