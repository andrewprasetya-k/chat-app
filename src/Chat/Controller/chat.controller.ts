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

  @Get()
  testChat() {
    return this.chatService.getAllMessages();
  }

  // Ambil semua pesan dari room tertentu (nanti bisa tambahkan query param)
  @Get('messages')
  getMessages(@Query('room_id') room_id: string) {
    return this.chatService.getMessagesByRoom(room_id);
  }

  // Buat chat room baru
  @Post('create-room')
  createRoom(@Body() body: CreateRoomDto) {
    return this.chatService.createRoom(body);
  }

  // Kirim pesan baru
  @UseGuards(AuthGuard)
  @Post(':cm_cr_id/send-message')
  sendMessage(
    @Body() body: SendMessageDto,
    @Param('cm_cr_id') cm_cr_id: string,
    @User('sub') cm_usr_id: string,
  ) {
    return this.chatService.sendMessage(body, cm_cr_id, cm_usr_id);
  }
}
