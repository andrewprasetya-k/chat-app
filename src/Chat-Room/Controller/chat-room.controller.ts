import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Param,
  Delete,
} from '@nestjs/common';
import { ChatRoomService } from '../Service/chat-room.service';
import { CreateRoomDto } from '../Dto/create-room.dto';
import { AuthGuard } from 'src/Auth/auth.guard';
import { User } from 'src/Auth/user.decorator';
import { AddRemoveMemberDto } from '../Dto/add-remove-member.dto';

@Controller('room')
export class ChatRoomController {
  constructor(private readonly chatRoomService: ChatRoomService) {}

  @Get('list')
  @UseGuards(AuthGuard)
  getAllRooms(@User('sub') userId: string) {
    return this.chatRoomService.getAllRooms(userId);
  }

  @Get(':roomId/messages')
  @UseGuards(AuthGuard)
  getRoomMessages(
    @Param('roomId') roomId: string,
    @Query('beforeAt') beforeAt: string,
    @Query('limit') limit: string,
    @User('sub') userId: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.chatRoomService.getRoomMessages(roomId, userId, beforeAt, limitNum);
  }

  @Post('create')
  @UseGuards(AuthGuard)
  createRoom(@Body() body: CreateRoomDto, @User('sub') userId: string) {
    return this.chatRoomService.createRoom(body, userId);
  }

  @Post(':roomId/leave')
  @UseGuards(AuthGuard)
  leaveRoom(@Param('roomId') roomId: string, @User('sub') userId: string) {
    return this.chatRoomService.leaveRoom(roomId, userId);
  }

  @Post(':roomId/add-members')
  @UseGuards(AuthGuard)
  addMembers(
    @Body() body: AddRemoveMemberDto,
    @Param('roomId') roomId: string,
    @User('sub') userId: string,
  ) {
    return this.chatRoomService.addMembers(body, userId, roomId);
  }

  @Post(':roomId/remove-members')
  @UseGuards(AuthGuard)
  removeMembers(
    @Body() body: AddRemoveMemberDto,
    @User('sub') userId: string,
    @Param('roomId') roomId: string,
  ) {
    return this.chatRoomService.removeMembers(body, userId, roomId);
  }

  @Delete(':roomId')
  @UseGuards(AuthGuard)
  deleteRoom(
    @Param('roomId') roomId: string,
    @User('sub') userId: string,
  ) {
    return this.chatRoomService.deleteRoom(roomId, userId);
  }

  @Get(':roomId/info')
  @UseGuards(AuthGuard)
  getRoomInfo(
    @Param('roomId') roomId: string,
    @User('sub') userId: string,
  ) {
    return this.chatRoomService.getRoomInfo(roomId, userId);
  }
}
