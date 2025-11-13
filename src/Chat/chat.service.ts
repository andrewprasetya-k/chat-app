import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from 'src/Supabase/supabase.service';
import { SendMessageDto } from './Dto/send-message.dto';
import { CreateRoomDto } from './Dto/create-room.dto';

@Injectable()
export class ChatService {
  constructor(private readonly supabase: SupabaseService) {}

  // Dummy untuk test
  getAllMessages() {
    return [{ id: 1, text: 'Hello, world!' }];
  }

  async getMessagesByRoom(room_id:string){
    try {
        const client = this.supabase.getClient();
        const { data, error } = await client
          .from('chat_message')
          .select(`
            message_text,
            created_at,
            user:cm_usr_id (
              usr_nama_lengkap
            )
          `)
          .eq('cm_cr_id', room_id)
          .order('created_at', { ascending: true });

        if (error) {
          throw new InternalServerErrorException(error.message);
        }
        return data;
    } catch (error) {
        
    }
  }

  // Kirim pesan ke Supabase
  async sendMessage(dto: SendMessageDto) 
  {
    const { cm_cr_id, cm_usr_id, message_text } = dto;

    try {
      const client = this.supabase.getClient();
      const { data, error } = await client
        .from('chat_message') // pastikan tabel di Supabase bernama "messages"
        .insert([
          {
            cm_cr_id,
            cm_usr_id,
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

    async createRoom(dto: CreateRoomDto) {
    const client = this.supabase.getClient();
    const { cr_name, cr_is_group, members } = dto;

    try {
    // Buat room baru
    const { data: room, error: roomError } = await client
        .from('chat_room')
        .insert([{ cr_name, cr_is_group }])
        .select()
        .single();

    if (roomError) throw roomError;

    // Tambahkan anggota ke chat_room_members
    const membersToInsert = members.map((usr_id) => ({
        crm_cr_id: room.cr_id,
        crm_usr_id: usr_id,
    }));

    const { error: memberError } = await client
        .from('chat_room_member')
        .insert(membersToInsert);

    if (memberError) throw memberError;

    return { success: true, room };
    } catch (error: any) {
    throw new InternalServerErrorException(error.message || 'Failed to create room');
    }
    }

}
