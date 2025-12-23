import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ChatSharedService } from '../chat-shared.service';

@Injectable()
export class RoomMemberGuard implements CanActivate {
  constructor(private readonly chatSharedService: ChatSharedService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const params = request.params;
    const body = request.body;

    // 1. Get User ID
    const userId = user?.sub;
    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    // 2. Get Room ID
    // Antisipasi dua metode @Param('roomId') or body { roomId: ... }
    const roomId = params.roomId || body.roomId;

    if (!roomId) {
      throw new BadRequestException(
        'Room ID not found in request params or body',
      );
    }

    // 3. Cek apakah user adalah member di room tersebut
    const isMember = await this.chatSharedService.isUserMemberOfRoom(
      roomId,
      userId,
    );

    if (!isMember) {
      throw new ForbiddenException(
        'You are not a member of this chat room or you have left it.',
      );
    }

    return true;
  }
}
