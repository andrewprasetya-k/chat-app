import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserController } from './Controller/user.controller';
import { UserService } from './Service/user.service';
import { AuthModule } from './Auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AppController, UserController],
  providers: [AppService, UserService],
})
export class AppModule {}
