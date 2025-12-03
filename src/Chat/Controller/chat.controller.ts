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
  getRoomChat(@User('sub') userId: string) {
    return this.chatService.getRoomChat(userId);
  }

  // Ambil semua pesan dari room tertentu (nanti bisa tambahkan query param)
  @UseGuards(AuthGuard)
  @Get('get-room-chat/:room_id')
  getMessages(@Param('room_id') cm_cr_id: string) {
    return this.chatService.getMessagesByRoom(cm_cr_id);
  }

  // Buat chat room baru
  @UseGuards(AuthGuard)
  @Post('create-room')
  createRoom(@Body() body: CreateRoomDto, @User('sub') userId: string) {
    return this.chatService.createRoom(body, userId);
  }

  // Kirim pesan baru
  @UseGuards(AuthGuard)
  @Post('send/:chatRoomId')
  sendMessage(
    @Body() body: SendMessageDto,
    @Param('chatRoomId') chatRoomId: string,
    @User('sub') userId: string,
  ) {
    return this.chatService.sendMessage(body, chatRoomId, userId);
  }
}
