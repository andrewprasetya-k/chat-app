import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Param,
  Patch,
} from '@nestjs/common';
import { ChatService } from '../Service/chat.service';
import { SendMessageDto } from '../Dto/send-message.dto';
import { CreateRoomDto } from '../Dto/create-room.dto';
import { AuthGuard } from 'src/Auth/auth.guard';
import { User } from 'src/Auth/user.decorator';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(AuthGuard)
  @Get('get-room-chat')
  getAllRoomChatController(@User('sub') userId: string) {
    return this.chatService.getAllRoomChatService(userId);
  }

  // Ambil semua pesan dari room tertentu (nanti bisa tambahkan query param)
  @UseGuards(AuthGuard)
  @Get('get-room-chat/:room_id')
  getDetailedRoomChatController(
    @Param('room_id') cm_cr_id: string,
    @User('sub') userId: string,
  ) {
    return this.chatService.getDetailedRoomChatService(cm_cr_id, userId);
  }

  // Buat chat room baru
  @UseGuards(AuthGuard)
  @Post('create-room')
  createRoomController(
    @Body() body: CreateRoomDto,
    @User('sub') userId: string,
  ) {
    return this.chatService.createRoomService(body, userId);
  }

  // Kirim pesan baru
  @UseGuards(AuthGuard)
  @Post('send/:chatRoomId')
  sendMessageController(
    @Body() body: SendMessageDto,
    @Param('chatRoomId') chatRoomId: string,
    @User('sub') userId: string,
  ) {
    return this.chatService.sendMessageService(body, chatRoomId, userId);
  }

  @UseGuards(AuthGuard)
  @Post('leave-room/:roomId')
  leaveRoomController(
    @Param('roomId') roomId: string,
    @User('sub') userId: string,
  ) {
    return this.chatService.leaveRoomService(roomId, userId);
  }

  @Post('read/:messageId')
  @UseGuards(AuthGuard)
  async markAsReadController(
    @Param('messageId') messageId: string,
    @User() user: any,
  ) {
    return this.chatService.markMessageAsReadService(messageId, user.sub);
  }

  @Get('unread-count/:roomId')
  @UseGuards(AuthGuard)
  async getUnreadCountController(
    @User() user: any,
    @Param('roomId') roomId: string,
  ) {
    return this.chatService.countUnreadMessagesServices(roomId, user.sub);
  }

  @Patch('unsend/:roomId/:messageId')
  @UseGuards(AuthGuard)
  async unsendMessageController(
    @Param('messageId') messageId: string,
    @Param('roomId') roomId: string,
    @User() user: any,
  ) {
    return this.chatService.unsendMessageService(roomId, messageId, user.sub);
  }

  @Get('search/:chatRoomId/:message')
  @UseGuards(AuthGuard)
  async searchMessagesController(
    @Param('chatRoomId') chatRoomId: string,
    @Param('message') message: string,
    @User() user: any,
  ) {
    return this.chatService.findMessageService(chatRoomId, message, user.sub);
  }
}
