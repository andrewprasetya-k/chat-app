/**
 * Application root module
 * -----------------------
 * Declares and wires the top-level modules, controllers and providers.
 * - Imports AuthModule for authentication features
 * - Imports SupabaseModule to provide DB access via SupabaseService
 * - Registers AppController and UserController
 */
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserController } from './User/user.controller';
import { UserModule } from './User/user.module';
import { AuthModule } from './Auth/auth.module';
import { SupabaseModule } from './Supabase/supabase.module';

@Module({
  imports: [AuthModule, SupabaseModule, UserModule],
  controllers: [AppController, UserController],
  providers: [AppService],
})
export class AppModule {}
