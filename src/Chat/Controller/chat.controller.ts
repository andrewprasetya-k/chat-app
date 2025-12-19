import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { ChatService } from '../Service/chat.service';
import { SendMessageDto } from '../Dto/send-message.dto';
import { CreateRoomDto } from '../Dto/create-room.dto';
import { AuthGuard } from 'src/Auth/auth.guard';
import { User } from 'src/Auth/user.decorator';
import { AddRemoveMemberDto } from '../Dto/add-remove-member.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(AuthGuard)
  @Get('get-room-chat')
  getAllRoomChatController(@User('sub') userId: string) {
    return this.chatService.getAllRoomChatService(userId);
  }

  // Ambil semua pesan dari room tertentu (pagination supported)
  @UseGuards(AuthGuard)
  @Get('get-room-chat/:room_id')
  getDetailedRoomChatController(
    @Param('room_id') cm_cr_id: string,
    @Query('beforeAt') beforeAt: string,
    @Query('limit') limit: string,
    @User('sub') userId: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.chatService.getDetailedRoomChatService(
      cm_cr_id,
      userId,
      beforeAt,
      limitNum,
    );
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

  @Post('read/:roomId/:messageId')
  @UseGuards(AuthGuard)
  async markAsReadController(
    @Param('messageId') messageId: string,
    @Param('roomId') roomId: string,
    @User() user: any,
  ) {
    return this.chatService.markMessageAsReadService(
      roomId,
      messageId,
      user.sub,
    );
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

  @Post('add-member/:roomId')
  @UseGuards(AuthGuard)
  async addMemberController(
    @Body() body: AddRemoveMemberDto,
    @Param('roomId') roomId: string,
    @User('sub') userId: string,
  ) {
    return this.chatService.addMemberService(body, userId, roomId);
  }

  @Post('remove-member/:roomId')
  @UseGuards(AuthGuard)
  async removeMemberController(
    @Body() body: AddRemoveMemberDto,
    @User('sub') userId: string,
    @Param('roomId') roomId: string,
  ) {
    return this.chatService.removeMemberService(body, userId, roomId);
  }

  @Delete('delete-room/:roomId')
  @UseGuards(AuthGuard)
  async deleteGroupRoomController(
    @Param('roomId') roomId: string,
    @User('sub') userId: string,
  ) {
    return this.chatService.deleteGroupRoomService(roomId, userId);
  }
}
