import { Module } from '@nestjs/common';
import { ChatRoomController } from './Controller/chat-room.controller';
import { ChatRoomService } from './Service/chat-room.service';
import { SupabaseModule } from 'src/Supabase/supabase.module';
import { AuthModule } from 'src/Auth/auth.module';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [ChatRoomController],
  providers: [ChatRoomService],
  exports: [ChatRoomService],
})
export class ChatRoomModule {}
