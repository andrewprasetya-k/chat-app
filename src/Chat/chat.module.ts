import { Module } from '@nestjs/common';
import { ChatController } from './Controller/chat.controller';
import { ChatService } from './Service/chat.service';
import { SupabaseModule } from 'src/Supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
