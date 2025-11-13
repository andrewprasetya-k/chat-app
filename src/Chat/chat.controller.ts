import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './Dto/send-message.dto';
import { CreateRoomDto } from './Dto/create-room.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  testChat() {
    return this.chatService.getAllMessages();
  }

  // Ambil semua pesan dari room tertentu (nanti bisa tambahkan query param)
  @Get('messages')
  getMessages(@Query('room_id') room_id: string) {
    return this.chatService.getMessagesByRoom(room_id);
  }

  @Post('create-room')
  createRoom(@Body() body: CreateRoomDto) {
    return this.chatService.createRoom(body);
  }

  // Kirim pesan baru
  @Post('send')
  sendMessage(@Body() body: SendMessageDto) {
    return this.chatService.sendMessage(body);
  }
}
