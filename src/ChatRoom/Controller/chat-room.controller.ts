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
import { RoomMemberGuard } from 'src/shared/guards/room-member.guard';
import { RoomAdminGuard } from 'src/shared/guards/room-admin.guard';
import { RoomActiveGuard } from 'src/shared/guards/room-active.guard';

import { GetRoomMessagesQueryDto } from '../Dto/get-room-messages.query.dto';

@Controller('room')
export class ChatRoomController {
  constructor(private readonly chatRoomService: ChatRoomService) {}

  @Get('active')
  @UseGuards(AuthGuard)
  getActiveRooms(@User('sub') userId: string) {
    return this.chatRoomService.getActiveRooms(userId);
  }

  @Get('deactivated')
  @UseGuards(AuthGuard)
  getDeactivatedRooms(@User('sub') userId: string) {
    return this.chatRoomService.getDeactivatedRooms(userId);
  }

  @Get('messages/:roomId')
  @UseGuards(AuthGuard, RoomActiveGuard, RoomMemberGuard)
  getRoomMessages(
    @Param('roomId') roomId: string,
    @Query() query: GetRoomMessagesQueryDto,
    @User('sub') userId: string,
  ) {
    return this.chatRoomService.getRoomMessages(
      roomId,
      userId,
      query.beforeAt,
      query.limit,
    );
  }

  @Post('create')
  @UseGuards(AuthGuard)
  createRoom(@Body() body: CreateRoomDto, @User('sub') userId: string) {
    return this.chatRoomService.createRoom(body, userId);
  }

  @Post('leave/:roomId')
  @UseGuards(AuthGuard, RoomActiveGuard, RoomMemberGuard)
  leaveRoom(@Param('roomId') roomId: string, @User('sub') userId: string) {
    return this.chatRoomService.leaveRoom(roomId, userId);
  }

  @Post('add-members/:roomId')
  @UseGuards(AuthGuard, RoomActiveGuard, RoomAdminGuard)
  addMembers(
    @Body() body: AddRemoveMemberDto,
    @Param('roomId') roomId: string,
    @User('sub') userId: string,
  ) {
    return this.chatRoomService.addMembers(body, userId, roomId);
  }

  @Post('remove-members/:roomId')
  @UseGuards(AuthGuard, RoomActiveGuard, RoomAdminGuard)
  removeMembers(
    @Body() body: AddRemoveMemberDto,
    @User('sub') userId: string,
    @Param('roomId') roomId: string,
  ) {
    return this.chatRoomService.removeMembers(body, userId, roomId);
  }

  @Delete(':roomId')
  @UseGuards(AuthGuard, RoomActiveGuard, RoomAdminGuard)
  deleteRoom(@Param('roomId') roomId: string, @User('sub') userId: string) {
    return this.chatRoomService.deleteRoom(roomId, userId);
  }

  @Get(':roomId')
  @UseGuards(AuthGuard, RoomActiveGuard, RoomMemberGuard)
  getRoomInfo(@Param('roomId') roomId: string, @User('sub') userId: string) {
    return this.chatRoomService.getRoomInfo(roomId, userId);
  }

  @Get('search/:query')
  @UseGuards(AuthGuard)
  searchRooms(@Param('query') query: string, @User('sub') userId: string) {
    return this.chatRoomService.searchRooms(userId, query);
  }

  @Post(':roomId')
  @UseGuards(AuthGuard, RoomActiveGuard)
  joinRoom(
    @Param('roomId') roomId: string,

    @User('sub') userId: string,
  ) {
    return this.chatRoomService.joinRoomService(roomId, userId);
  }

  @Post('approve/:roomId/:userId')
  @UseGuards(AuthGuard, RoomActiveGuard, RoomAdminGuard)
  approveJoinRequestController(
    @Param('roomId') roomId: string,
    @Param('userId') joinUserId: string,
    @User('sub') userId: string,
  ) {
    return this.chatRoomService.approveJoinRequestService(
      roomId,
      joinUserId,
      userId,
    );
  }

  @Post('reject/:roomId/:userId')
  @UseGuards(AuthGuard, RoomActiveGuard, RoomAdminGuard)
  rejectJoinRequestController(
    @Param('roomId') roomId: string,
    @Param('userId') requesterId: string,
    @User('sub') userId: string,
  ) {
    return this.chatRoomService.rejectJoinRequestService(
      roomId,
      requesterId,
      userId,
    );
  }

  @Post('promote/:roomId/:userId')
  @UseGuards(AuthGuard, RoomActiveGuard, RoomAdminGuard)
  promoteToAdminController(
    @Param('roomId') roomId: string,
    @Param('userId') promoteUserId: string,
    @User('sub') userId: string,
  ) {
    return this.chatRoomService.promoteToAdminService(
      roomId,
      userId,
      promoteUserId,
    );
  }

  @Post('demote/:roomId/:userId')
  @UseGuards(AuthGuard, RoomActiveGuard, RoomAdminGuard)
  demoteFromAdminController(
    @Param('roomId') roomId: string,
    @Param('userId') demoteUserId: string,
    @User('sub') userId: string,
  ) {
    return this.chatRoomService.demoteFromAdminService(
      roomId,
      userId,
      demoteUserId,
    );
  }
}
