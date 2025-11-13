import { Controller, Get, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './Dto/send-message.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('messages')
  getMessages() {
    return this.chatService.getAllMessages();
  }

  @Post('send')
  sendMessage(@Body() body: SendMessageDto) {
    return this.chatService.sendMessage(body.message_text);
  }
}
