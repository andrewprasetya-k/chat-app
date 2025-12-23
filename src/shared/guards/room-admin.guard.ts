import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ChatSharedService } from '../chat-shared.service';

@Injectable()
export class RoomAdminGuard implements CanActivate {
  constructor(private readonly chatSharedService: ChatSharedService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const params = request.params;
    const body = request.body;

    const userId = user?.sub;
    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    const roomId = params.roomId || body.roomId;

    if (!roomId) {
      throw new BadRequestException(
        'Room ID not found in request params or body',
      );
    }

    // cek apakah user adalah admin di room tersebut
    const isAdmin = await this.chatSharedService.isUserAdminOfRoom(
      roomId,
      userId,
    );

    if (!isAdmin) {
      throw new ForbiddenException(
        'You do not have administrative privileges in this room.',
      );
    }

    return true;
  }
}
