import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ChatSharedService } from '../chat-shared.service';

@Injectable()
export class RoomActiveGuard implements CanActivate {
  constructor(private readonly chatSharedService: ChatSharedService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const params = request.params;
    const body = request.body;
    const method = request.method;

    const roomId = params.roomId || body.roomId;

    if (!roomId) {
      throw new BadRequestException('Room ID not found in request');
    }

    const room = await this.chatSharedService.getRoomStatus(roomId);

    if (!room) {
      throw new NotFoundException('Chat room does not exist');
    }

    if (room.deleted_at) {
      // Allow Read-Only access (GET)
      if (method === 'GET') {
        return true;
      }
      // Block Write access (POST, DELETE, PATCH, PUT)
      throw new ForbiddenException(
        'This chat room has been deleted/archived and cannot be modified.',
      );
    }

    return true;
  }
}
