import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserController } from './User/user.controller';
import { UserService } from './User/user.service';
import { AuthModule } from './Auth/auth.module';
import { SupabaseModule } from './Supabase/supabase.module';

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [AppController, UserController],
  providers: [AppService, UserService],
})
export class AppModule {}
