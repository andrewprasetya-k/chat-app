import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { SupabaseModule } from 'src/Supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
