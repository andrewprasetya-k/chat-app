import { Module } from '@nestjs/common';
import { ChatController } from './Controller/chat.controller';
import { ChatService } from './Service/chat.service';
import { SupabaseModule } from 'src/Supabase/supabase.module';
import { AuthModule } from 'src/Auth/auth.module';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
