/**
 * Application root module
 * -----------------------
 * Declares and wires the top-level modules, controllers and providers.
 * - Imports AuthModule for authentication features
 * - Imports SupabaseModule to provide DB access via SupabaseService
 * - Imports ChatModule for messaging operations
 * - Imports ChatRoomModule for room management operations
 * - Imports SharedModule globally for common utilities
 * - Registers AppController and UserController
 */
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './User/user.module';
import { AuthModule } from './Auth/auth.module';
import { SupabaseModule } from './Supabase/supabase.module';
import { ChatModule } from './Chat/chat.module';
import { ChatRoomModule } from './ChatRoom/chat-room.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [SharedModule, AuthModule, SupabaseModule, UserModule, ChatModule, ChatRoomModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}