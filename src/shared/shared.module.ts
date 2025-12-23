import { Module } from '@nestjs/common';
import { ChatSharedService } from './chat-shared.service';
import { SupabaseModule } from 'src/Supabase/supabase.module';
import { RoomMemberGuard } from './guards/room-member.guard';
import { RoomAdminGuard } from './guards/room-admin.guard';

@Module({
  imports: [SupabaseModule],
  providers: [ChatSharedService, RoomMemberGuard, RoomAdminGuard],
  exports: [ChatSharedService, RoomMemberGuard, RoomAdminGuard],
})
export class SharedModule {}
