import { Module, forwardRef } from '@nestjs/common';
import { UserService } from './Service/user.service';
import { SupabaseModule } from 'src/Supabase/supabase.module';
import { UserController } from './Controller/user.controller';
import { AuthModule } from 'src/Auth/auth.module';

@Module({
  imports: [SupabaseModule, forwardRef(() => AuthModule)],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
