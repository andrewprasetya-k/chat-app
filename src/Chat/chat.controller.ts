import { Controller, Get, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './Dto/send-message.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  testChat(){
    return this.chatService.getAllMessages();
  }

  // Ambil semua pesan dari room tertentu (nanti bisa tambahkan query param)
  @Get('messages')
  getMessages() {
    return this.chatService.getAllMessages();
  }

  // Kirim pesan baru
  @Post('send')
  sendMessage(@Body() body: SendMessageDto) {
    return this.chatService.sendMessage(body);
  }
}
