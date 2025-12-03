import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from 'src/Supabase/supabase.service';
import { SendMessageDto } from '../Dto/send-message.dto';
import { CreateRoomDto } from '../Dto/create-room.dto';

@Injectable()
export class ChatService {
  constructor(private readonly supabase: SupabaseService) {}

  async getAllRoomChatService(userId: string) {
    try {
      const client = this.supabase.getClient();
      const { data, error } = await client
        .from('chat_room_member')
        .select(
          'chat_room (cr_id, cr_name, cr_is_group, members:chat_room_member(user:crm_usr_id (usr_id,usr_nama_lengkap)))',
        )
        .eq('crm_usr_id', userId)
        .is('leave_at', null)
        .order('joined_at', { ascending: true });

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      return data;
    } catch (error) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to fetch rooms',
      );
    }
  }

  async getDetailedRoomChatService(room_id: string) {
    try {
      const client = this.supabase.getClient();
      const { data, error } = await client
        .from('chat_message')
        .select(
          `
            message_text,
            created_at,
            user:cm_usr_id (
              usr_nama_lengkap
            )
          `,
        )
        .eq('cm_cr_id', room_id)
        .order('created_at', { ascending: true });

      if (error) {
        throw new InternalServerErrorException(error.message);
      }
      return data;
    } catch (error) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to fetch messages',
      );
    }
  }

  // Kirim pesan ke Supabase
  async sendMessageService(
    dto: SendMessageDto,
    chatRoomId: string,
    userId: string,
  ) {
    const { message_text } = dto;

    try {
      const client = this.supabase.getClient();
      const { data, error } = await client
        .from('chat_message') // pastikan tabel di Supabase bernama "messages"
        .insert([
          {
            cm_cr_id: chatRoomId,
            cm_usr_id: userId,
            message_text,
          },
        ])
        .select();

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      return {
        success: true,
        // message: data[0], buka komen ini untuk melihat data yang dikirim
      };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to send message',
      );
    }
  }

  async validateUser(userIds: string[]) {
    const client = this.supabase.getClient();
    try {
      const { data, error } = await client
        .from('user')
        .select('usr_id, usr_nama_lengkap')
        .in('usr_id', userIds);

      if (error) {
        throw new InternalServerErrorException(
          'Database error during user validation',
        );
      }

      // Check missing users
      const foundIds = (data || []).map((user) => user.usr_id);
      const missingIds = userIds.filter((id) => !foundIds.includes(id));

      if (missingIds.length > 0) {
        throw new InternalServerErrorException(
          `Missing user IDs: ${missingIds.join(', ')}`,
        );
      }

      return data;
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to validate users',
      );
    }
  }

  async validatePersonalChat(
    memberIds: [string, string],
  ): Promise<string | null> {
    const client = this.supabase.getClient();
    try {
      // Query semua rooms dimana kedua users adalah member
      const { data, error } = await client
        .from('chat_room_member')
        .select('crm_cr_id, crm_usr_id')
        .in('crm_usr_id', memberIds);

      if (error) {
        throw new InternalServerErrorException(
          'Database error during room validation',
        );
      }

      if (!data || data.length === 0) {
        return null; // Tidak ada room bersama
      }

      // Hitung jumlah member per room
      const roomMemberCount: { [roomId: string]: number } = {};

      data.forEach((record) => {
        const roomId = record.crm_cr_id;
        roomMemberCount[roomId] = (roomMemberCount[roomId] || 0) + 1;
      });

      // Cari room yang memiliki EXACTLY 2 members (kedua users)
      for (const roomId of Object.keys(roomMemberCount)) {
        if (roomMemberCount[roomId] === 2) {
          // Verifikasi bahwa room ini memiliki kedua users yang tepat
          const roomMembers = data
            .filter((record) => record.crm_cr_id === roomId)
            .map((record) => record.crm_usr_id);

          const hasBothUsers = memberIds.every((userId) =>
            roomMembers.includes(userId),
          );

          if (hasBothUsers) {
            return roomId; // Found personal chat room
          }
        }
      }

      return null; // Tidak ada personal chat yang cocok
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to validate room',
      );
    }
  }

  async createRoomService(dto: CreateRoomDto, creatorId: string) {
    const client = this.supabase.getClient();
    const { cr_name, cr_is_group, members } = dto;
    //memasukkan creatorId ke members
    if (!dto.members.includes(creatorId)) {
      dto.members.push(creatorId);
    }

    console.log('Members in createRoom:', dto.members);

    //cek kalau mau buat chat personal
    if (members.length === 2 && !cr_is_group) {
      //validasi apakah personal chat sudah ada
      const existingRoomId = await this.validatePersonalChat([
        members[0],
        members[1],
      ]);
      dto.cr_name = ' '; //kosongkan nama kalau personal chat sudah ada
      dto.cr_is_group = false;
      if (existingRoomId) {
        return {
          success: true,
          room: { cr_id: existingRoomId },
          message: 'Personal chat room already exists',
        };
      }
    }

    //validasi members
    await this.validateUser(dto.members);

    try {
      // Buat room baru
      const { data: room, error: roomError } = await client
        .from('chat_room')
        .insert([
          {
            cr_name: dto.cr_name,
            cr_is_group: dto.cr_is_group,
            created_by: creatorId,
          },
        ])
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
      throw new InternalServerErrorException(
        error.message || 'Failed to create room',
      );
    }
  }

  async leaveRoomService(roomId: string, userId: string) {
    const client = this.supabase.getClient();
    try {
      const now = new Date().toISOString();
      const { error } = await client
        .from('chat_room_member')
        .update({ leave_at: now })
        .eq('crm_cr_id', roomId)
        .eq('crm_usr_id', userId)
        .is('leave_at', null); // hanya update jika belum pernah leave

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      return { success: true, message: 'Left the room successfully' };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to leave room',
      );
    }
  }
}
