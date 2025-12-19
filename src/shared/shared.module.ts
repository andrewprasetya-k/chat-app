import { Module } from '@nestjs/common';
import { ChatSharedService } from './chat-shared.service';
import { SupabaseModule } from 'src/Supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  providers: [ChatSharedService],
  exports: [ChatSharedService],
})
export class SharedModule {}
