import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from 'src/Supabase/supabase.service';
import { SendMessageDto } from './Dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(private readonly supabase: SupabaseService) {}

  // Dummy untuk test
  getAllMessages() {
    return [{ id: 1, text: 'Hello, world!' }];
  }

  // Kirim pesan ke Supabase
  async sendMessage(dto: SendMessageDto) {
    const { room_id, sender_id, message_text } = dto;

    try {
      const client = this.supabase.getClient();
      const { data, error } = await client
        .from('chat_message') // pastikan tabel di Supabase bernama "messages"
        .insert([
          {
            room_id,
            sender_id,
            message_text,
          },
        ])
        .select();

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      return {
        success: true,
        data: data[0],
      };
    } catch (error: any) {
      throw new InternalServerErrorException(error?.message || 'Failed to send message');
    }
  }
}
