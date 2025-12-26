import { Module } from '@nestjs/common';
import { ChatController } from './Controller/chat.controller';
import { ChatService } from './Service/chat.service';
import { SupabaseModule } from 'src/Supabase/supabase.module';
import { AuthModule } from 'src/Auth/auth.module';
import { SharedModule } from 'src/shared/shared.module';
import { ChatGateway } from './Gateway/chat.gateway';

@Module({
  imports: [SupabaseModule, AuthModule, SharedModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService, ChatGateway], // Export ChatGateway jika module lain butuh
})
export class ChatModule {}
