import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Param,
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
}
