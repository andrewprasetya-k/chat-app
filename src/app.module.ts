/**
 * Application root module
 * -----------------------
 * Declares and wires the top-level modules, controllers and providers.
 * - Imports AuthModule for authentication features
 * - Imports SupabaseModule to provide DB access via SupabaseService
 * - Imports ChatModule for messaging operations
 * - Imports ChatRoomModule for room management operations
 * - Registers AppController and UserController
 */
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './User/user.module';
import { AuthModule } from './Auth/auth.module';
import { SupabaseModule } from './Supabase/supabase.module';
import { ChatModule } from './Chat/chat.module';
import { ChatRoomModule } from './Chat-Room/chat-room.module';

@Module({
  imports: [AuthModule, SupabaseModule, UserModule, ChatModule, ChatRoomModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}