import { Module } from '@nestjs/common';
import { ChatSharedService } from './chat-shared.service';
import { SupabaseModule } from 'src/Supabase/supabase.module';
import { RoomMemberGuard } from './guards/room-member.guard';
import { RoomAdminGuard } from './guards/room-admin.guard';
import { RoomActiveGuard } from './guards/room-active.guard';

@Module({
  imports: [SupabaseModule],
  providers: [
    ChatSharedService,
    RoomMemberGuard,
    RoomAdminGuard,
    RoomActiveGuard,
  ],
  exports: [ChatSharedService, RoomMemberGuard, RoomAdminGuard, RoomActiveGuard],
})
export class SharedModule {}
