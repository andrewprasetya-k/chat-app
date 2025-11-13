import { Module, forwardRef } from '@nestjs/common';
import { UserService } from './user.service';
import { SupabaseModule } from 'src/Supabase/supabase.module';
import { UserController } from './user.controller';
import { AuthModule } from 'src/Auth/auth.module';

@Module({
  imports: [SupabaseModule, forwardRef(() => AuthModule)],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
