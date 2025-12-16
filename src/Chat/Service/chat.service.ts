import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from 'src/Supabase/supabase.service';
import { SendMessageDto } from '../Dto/send-message.dto';
import { CreateRoomDto } from '../Dto/create-room.dto';
import {
  ChatMessageDto,
  GetDetailedRoomChatDto,
  ReadByDto,
} from '../Dto/get-detailed-room-chat.dto';

@Injectable()
export class ChatService {
  constructor(private readonly supabase: SupabaseService) {}

  //todo: dto
  async getAllRoomChatService(userId: string) {
    try {
      const client = this.supabase.getClient();

      const { data, error } = await client
        .from('chat_room_member')
        .select(
          `
        chat_room:crm_cr_id (
          cr_id,
          cr_name,
          cr_is_group,
          last_message:chat_message (
            cm_id,
            message_text,
            created_at,
            sender:cm_usr_id (
              usr_id,
              usr_nama_lengkap
            )
          )
        )
        `,
        )
        .eq('crm_usr_id', userId)
        .is('leave_at', null)
        .order('created_at', {
          foreignTable: 'chat_room.chat_message',
          ascending: false,
        })
        .limit(1, {
          foreignTable: 'chat_room.chat_message',
        });
      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      return data;
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to fetch rooms',
      );
    }
  }

  //todo: paginantion
  async getDetailedRoomChatService(
    roomId: string,
    userId: string,
  ): Promise<GetDetailedRoomChatDto> {
    const isInChat = await this.stillInChat(roomId, userId);
    const isMember = await this.isMemberOfRoom(roomId, userId);

    if (!isMember) {
      throw new InternalServerErrorException(
        'You are not a member of this chat room.',
      );
    }

    try {
      const client = this.supabase.getClient();
      //ambil pesan dari chat room
      const { data: messages, error: messageError } = await client
        .from('chat_message')
        .select(
          `
        cm_id,
        message_text,
        created_at,
        sender:cm_usr_id (
          usr_id,
          usr_nama_lengkap
        ),
        read_receipts (
          reader:rr_usr_id (
            usr_id,
            usr_nama_lengkap
          )
        )
      `,
        )
        .eq('cm_cr_id', roomId)
        .order('created_at', { ascending: true });

      if (messageError) {
        throw new InternalServerErrorException(messageError.message);
      }

      //ambil member chat room
      const { data: room, error: roomError } = await client
        .from('chat_room')
        .select(
          `
        cr_name,
        cr_is_group,
        members:chat_room_member (
          user:crm_usr_id (
            usr_id,
            usr_nama_lengkap
          )
        )
      `,
        )
        .eq('cr_id', roomId)
        .maybeSingle();

      if (roomError || !room) {
        throw new InternalServerErrorException('Chat room not found');
      }

      // Tentukan nama room berdasarkan tipe (grup/personal)
      let roomName = room.cr_name ?? '';

      if (!room.cr_is_group) {
        const otherUser = room.members
          .flatMap((m) => m.user)
          .find((u) => u.usr_id !== userId);

        roomName = otherUser?.usr_nama_lengkap ?? '';
      }

      const mappedMessages: ChatMessageDto[] = (messages ?? []).map((msg) => {
        const sender = msg.sender?.[0] ?? null;

        return {
          textId: msg.cm_id,
          text: msg.message_text,
          createdAt: msg.created_at,

          sender: sender
            ? {
                senderId: sender.usr_id,
                senderName: sender.usr_nama_lengkap,
              }
            : null,

          readBy: (msg.read_receipts ?? [])
            .map((rr) => {
              const reader = rr.reader?.[0];
              if (!reader) return null;

              return {
                userId: reader.usr_id,
                userName: reader.usr_nama_lengkap,
              };
            })
            .filter(Boolean) as ReadByDto[],
        };
      });
      return {
        roomName: roomName,
        stillInChat: isInChat,
        messages: mappedMessages,
      };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to fetch messages',
      );
    }
  }

  async isMemberOfRoom(roomId: string, userId: string) {
    const client = this.supabase.getClient();
    try {
      const { data, error } = await client
        .from('chat_room_member')
        .select('crm_usr_id, joined_at, leave_at')
        .eq('crm_cr_id', roomId)
        .eq('crm_usr_id', userId)
        .is('leave_at', null)
        .order('joined_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new InternalServerErrorException(error.message);
      }
      if (data) {
        return true;
      }
      return false;
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to validate membership',
      );
    }
  }

  async stillInChat(roomId: string, userId: string) {
    const client = this.supabase.getClient();
    try {
      const { data, error } = await client
        .from('chat_room_member')
        .select('leave_at, joined_at')
        .eq('crm_cr_id', roomId)
        .eq('crm_usr_id', userId)
        .order('joined_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      //cara baca/mapping key tertentu dari fetch data supabase

      if (data !== null && data.leave_at === null) {
        return true;
      }
      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      return false; // sudah leave
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to validate membership',
      );
    }
  }

  // Kirim pesan ke Supabase
  async sendMessageService(
    dto: SendMessageDto,
    chatRoomId: string,
    userId: string,
  ): Promise<SendMessageDto> {
    // Cek apakah user masih anggota room
    const inChat = await this.stillInChat(chatRoomId, userId);
    const isMember = await this.isMemberOfRoom(chatRoomId, userId);
    if (!isMember) {
      throw new InternalServerErrorException(
        'You are not a member of this chat room.',
      );
    }
    if (!inChat) {
      throw new InternalServerErrorException(
        'You have left the chat room and cannot send messages.',
      );
    }
    const { text } = dto;
    if (!text || text.trim() === '') {
      throw new InternalServerErrorException('Message text cannot be empty.');
    }
    try {
      const client = this.supabase.getClient();
      const { data: newMessage, error } = await client
        .from('chat_message') // pastikan tabel di Supabase bernama "messages"
        .insert([
          {
            cm_cr_id: chatRoomId,
            cm_usr_id: userId,
            message_text: text,
          },
        ])
        .select(
          `cm_id, message_text, created_at, sender:cm_usr_id (usr_id, usr_nama_lengkap)`,
        )
        .single();

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      if (newMessage) {
        const channelName = `chat_room_${chatRoomId}`;
        const channel = client.channel(channelName);

        // Kirim pesan ke channel Supabase Realtime
        await channel.send({
          type: 'broadcast',
          event: 'new_message',
          payload: newMessage,
        });
      }

      return {
        success: true,
        text: newMessage.message_text,
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

  async isPersonalChat(memberIds: [string, string]): Promise<string | null> {
    const client = this.supabase.getClient();
    try {
      // Query semua rooms dimana kedua users adalah member
      const { data, error } = await client
        .from('chat_room_member')
        .select('crm_cr_id, crm_usr_id');

      if (error) {
        throw new InternalServerErrorException(
          'Database error during room validation',
        );
      }

      if (!data || data.length === 0) {
        return null; // Tidak ada room bersama
      }

      // Buat map dari roomId -> Set(userIds) untuk menghitung member unik per room
      const membersByRoom = new Map<string, Set<string>>();

      for (const row of data) {
        const roomId = row.crm_cr_id;
        const userId = row.crm_usr_id;

        if (!membersByRoom.has(roomId)) {
          membersByRoom.set(roomId, new Set());
        }
        membersByRoom.get(roomId)!.add(userId);
      }
      console.log(membersByRoom);
      // Cari room yang persis memiliki 2 member dan keduanya cocok dengan memberIds
      for (const [roomId, userSet] of membersByRoom.entries()) {
        // Hanya pertimbangkan room dengan tepat 2 member (personal chat)
        if (userSet.size >= 3) continue;

        // Cek apakah kedua user yang dicari ada di room ini
        const bothUsersPresent = memberIds.every((id) => userSet.has(id));
        if (bothUsersPresent) {
          return roomId; // ketemu personal chat
        }
      }

      return null; // tidak ada personal chat yang cocok
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to validate room',
      );
    }
  }

  async createRoomService(dto: CreateRoomDto, creatorId: string) {
    const client = this.supabase.getClient();
    const { chatRoomName, isGroup, members } = dto;
    //memasukkan creatorId ke members
    if (!dto.members.includes(creatorId)) {
      dto.members.push(creatorId);
    }

    console.log('Members in createRoom:', dto.members);

    //cek kalau mau buat chat personal
    if (dto.members.length === 2 && !isGroup) {
      //validasi apakah personal chat sudah ada
      const existingRoomId = await this.isPersonalChat([
        members[0],
        members[1],
      ]);
      dto.isPrivate = true;
      dto.chatRoomName = ''; //kosongkan nama kalau personal chat sudah ada
      dto.isGroup = false;
      if (existingRoomId) {
        return {
          success: true,
          room: { roomId: existingRoomId },
          message: 'Personal chat room already exists',
        };
      }
    } else if (dto.members.length < 2) {
      throw new InternalServerErrorException(
        'A chat must have at least 2 members',
      );
    }

    //validasi members
    await this.validateUser(dto.members);

    if (dto.members.length >= 3) {
      dto.isGroup = true; //paksa jadi group kalau anggotanya lebih dari 2
    }
    if (dto.isGroup && dto.chatRoomName?.trim() === '') {
      throw new InternalServerErrorException(
        'Group chat must have a valid name',
      );
    }

    try {
      // Buat room baru
      const { data: room, error: roomError } = await client
        .from('chat_room')
        .insert([
          {
            cr_name: dto.chatRoomName,
            cr_is_group: dto.isGroup,
            cr_private: dto.isPrivate,
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

      return { success: true, roomId: room.cr_id };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error.message || 'Failed to create room',
      );
    }
  }

  async leaveRoomService(roomId: string, userId: string) {
    const isMember = await this.isMemberOfRoom(roomId, userId);
    if (!isMember) {
      throw new InternalServerErrorException(
        'You are not a member of this chat room.',
      );
    }
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

      return { success: true, message: 'Left the room successfully at ', now };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to leave room',
      );
    }
  }

  async markMessageAsReadService(
    roomId: string,
    messageId: string,
    userId: string,
  ) {
    const isMember = await this.isMemberOfRoom(roomId, userId);
    if (!isMember) {
      throw new InternalServerErrorException(
        'You are not a member of this chat room.',
      );
    }
    const client = this.supabase.getClient();
    try {
      //  upsert untuk menghindari error jika data sudah ada
      // (jika user secara tidak sengaja menandai pesan yang sama 2x)
      const { error } = await client.from('read_receipts').upsert(
        {
          rr_cm_id: messageId,
          rr_usr_id: userId,
          read_at: new Date().toISOString(),
        },
        { onConflict: 'rr_cm_id,rr_usr_id' }, // Kunci unik yang sudah kita buat
      );

      if (error) throw error;

      return { success: true, message: 'Message marked as read.' };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error.message || 'Failed to mark message as read',
      );
    }
  }

  async countUnreadMessagesServices(roomId: string, userId: string) {
    const client = this.supabase.getClient();
    try {
      // Langkah 1: Ambil semua ID pesan yang sudah pernah dibaca oleh pengguna ini di seluruh aplikasi.
      const { data: readReceipts, error: readError } = await client
        .from('read_receipts')
        .select('rr_cm_id')
        .eq('rr_usr_id', userId);

      if (readError) {
        throw new InternalServerErrorException(
          readError.message,
          'Failed fetching read receipts',
        );
      }

      // Ubah hasil query menjadi array of strings, contoh: ['id1', 'id2', ...]
      const readMessageIds = readReceipts.map((item) => item.rr_cm_id);

      // Jika pengguna belum pernah membaca pesan apa pun, kita bisa langsung hitung semua pesan di room.
      // Ini juga untuk mencegah error jika kita memberikan array kosong ke filter .not('in', ...).
      if (readMessageIds.length === 0) {
        const { count, error: totalError } = await client
          .from('chat_message')
          .select('cm_id, cm_cr_id', { count: 'exact', head: true })
          .eq('cm_cr_id', roomId);

        if (totalError) throw totalError;
        return { success: true, unreadCount: count };
      }

      // Langkah 2: Hitung pesan di room ini yang ID-nya TIDAK ADA di dalam daftar pesan yang sudah dibaca.
      const { count, error: countError } = await client
        .from('chat_message')
        .select('cm_id, cm_cr_id', { count: 'exact', head: true })
        .eq('cm_cr_id', roomId)
        .not('cm_id', 'in', `(${readMessageIds.join(',')})`); // Formatnya harus '(id1,id2,id3)'

      if (countError) {
        throw new InternalServerErrorException(
          countError.message,
          'Failed counting unread messages',
        );
      }

      return { success: true, unreadCount: count };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to count unread messages',
        error?.details,
      );
    }
  }

  async unsendMessageService(
    roomId: string,
    messageId: string,
    userId: string,
  ) {
    const client = this.supabase.getClient();
    try {
      const { data, error } = await client
        .from('chat_message')
        .select('cm_usr_id')
        .eq('cm_id', messageId)
        .single();

      const inChat = await this.stillInChat(roomId, userId);
      if (!inChat) {
        throw new InternalServerErrorException(
          'You have left the chat room and cannot unsend messages.',
        );
      }

      if (error) throw error;

      if (data.cm_usr_id !== userId) {
        throw new InternalServerErrorException(
          'You can only unsend your own messages.',
        );
      }

      const { error: deleteError } = await client
        .from('chat_message')
        .update({ message_text: '[This message was unsent]' })
        .eq('cm_id', messageId);

      if (deleteError) throw deleteError;

      return { success: true, message: 'Message unsent successfully.' };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error.message || 'Failed to unsend message',
      );
    }
  }

  async findMessageService(
    chatRoomId: string,
    message: string,
    userId: string,
  ) {
    try {
      const isMember = await this.isMemberOfRoom(chatRoomId, userId);
      if (!isMember) {
        throw new InternalServerErrorException(
          'You are not a member of this chat room.',
        );
      }
      const client = this.supabase.getClient();
      const { data, error } = await client
        .from('chat_message')
        .select(
          `
            cm_id,
            message_text,
            created_at,
            sender:cm_usr_id (
              usr_id,
              usr_nama_lengkap
            ),
            read_receipts (
              read_at,
              reader:rr_usr_id (
                usr_id,
                usr_nama_lengkap
              )
            )
          `,
        )
        .eq('cm_cr_id', chatRoomId)
        .ilike('message_text', `%${message}%`)
        .order('created_at', { ascending: true });

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      return data;
    } catch (error) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to search messages',
      );
    }
  }
}
