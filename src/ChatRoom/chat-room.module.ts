import { Module } from '@nestjs/common';
import { ChatRoomController } from './Controller/chat-room.controller';
import { ChatRoomService } from './Service/chat-room.service';
import { SupabaseModule } from 'src/Supabase/supabase.module';
import { AuthModule } from 'src/Auth/auth.module';
import { SharedModule } from 'src/shared/shared.module';
import { UserModule } from 'src/User/user.module';

@Module({
  imports: [SupabaseModule, AuthModule, SharedModule, UserModule],
  controllers: [ChatRoomController],
  providers: [ChatRoomService],
  exports: [ChatRoomService],
})
export class ChatRoomModule {}
