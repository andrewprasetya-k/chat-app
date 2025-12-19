import { Module, Global } from '@nestjs/common';
import { ChatSharedService } from './chat-shared.service';
import { SupabaseModule } from 'src/Supabase/supabase.module';

@Global()
@Module({
  imports: [SupabaseModule],
  providers: [ChatSharedService],
  exports: [ChatSharedService],
})
export class SharedModule {}
