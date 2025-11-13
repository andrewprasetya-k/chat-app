import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from 'src/Supabase/supabase.service';

@Injectable()
export class ChatService {
    constructor(private readonly supabase: SupabaseService) {}
    getAllMessages() {
        return [{ id: 1, text: 'Hello, world!' }];
    }

    async sendMessage(text: string) {
        try {
            const client = this.supabase.getClient();
            const { data, error } = await client.from('chat_message').insert([{ text }]);
            if (error) {
                throw new InternalServerErrorException(error.message);
            }
            return { success: true, text };
        } catch (error: any) {
            throw new InternalServerErrorException(error?.message || 'Failed to send message');
        }
    }
}
