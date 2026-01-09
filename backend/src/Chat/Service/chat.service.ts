import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from 'src/Supabase/supabase.service';
import { SendMessageDto } from '../Dto/send-message.dto';
import { ChatSharedService } from 'src/shared/chat-shared.service';
import { ChatMessageEntity } from '../Entity/chat.entity';
import { plainToInstance } from 'class-transformer';
import { ChatGateway } from '../Gateway/chat.gateway'; // Import Gateway
import { read } from 'fs';
import { create } from 'domain';

@Injectable()
export class ChatService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly chatGateway: ChatGateway, // Inject Gateway
  ) {}

  async sendMessage(dto: SendMessageDto, roomId: string, userId: string) {
    const client = this.supabase.getClient();
    try {
      const { text, replyTo } = dto;
      if (!text || text.trim() === '') {
        throw new BadRequestException('Message text cannot be empty.');
      }

      // ... (Validation logic stays same)
      if (replyTo) {
        const { data: exists, error: checkError } = await client
          .from('chat_message')
          .select('cm_id')
          .eq('cm_id', replyTo)
          .eq('cm_cr_id', roomId)
          .maybeSingle();

        if (checkError) {
          throw new InternalServerErrorException(
            `Error checking reply: ${checkError.message}`,
          );
        }

        if (!exists) {
          throw new BadRequestException(
            'The message you are trying to reply to does not exist in this room.',
          );
        }
      }

      const { data: newMessage, error } = await client
        .from('chat_message')
        .insert([
          {
            cm_cr_id: roomId,
            cm_usr_id: userId,
            message_text: text,
            cm_reply_to_id: replyTo || null,
            cm_type: 'user',
            created_at: new Date().toISOString(),
          },
        ])
        .select(
          `
          cm_id, 
          cm_cr_id,
          message_text, 
          cm_type,
          created_at, 
          cm_reply_to_id, 
          sender:cm_usr_id (
            usr_id, 
            usr_nama_lengkap
          ),
          parent_message:chat_message!cm_reply_to_id (
            cm_id,
            message_text,
            sender:cm_usr_id (
               usr_nama_lengkap
            )
          ),
          chat_room:cm_cr_id (
            cr_name,
            cr_is_group,
            members:chat_room_member (
              user:crm_usr_id (
                usr_id,
                usr_nama_lengkap
              )
            )
          )
          `,
        )
        .single();

      if (error) {
        throw new InternalServerErrorException(
          `Database error: ${error.message}`,
        );
      }

      // Fix Room Name for Personal Chats
      if (newMessage && newMessage.chat_room) {
        const room = Array.isArray(newMessage.chat_room)
          ? newMessage.chat_room[0]
          : newMessage.chat_room;

        if (!room.cr_name) {
          const members = room.members || [];
          const otherMember = members
            .flatMap((m: any) => (Array.isArray(m.user) ? m.user : [m.user]))
            .find((u: any) => u?.usr_id !== userId);

          if (otherMember) {
            room.cr_name = otherMember.usr_nama_lengkap;
          }
        }
      }

      // --- BROADCAST LOGIC (WebSocket) ---
      const transformedMessage = plainToInstance(
        ChatMessageEntity,
        newMessage,
        {
          excludeExtraneousValues: true,
          enableImplicitConversion: true,
        },
      );

      if (transformedMessage) {
        // Kirim ke room spesifik: "room_{roomId}"
        this.chatGateway.server
          .to(`room_${roomId}`)
          .emit('new_message', transformedMessage);
      }

      return transformedMessage;
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        error?.message || 'Failed to send message',
      );
    }
  }

  async sendSystemMessage(roomId: string, text: string, actorId: string) {
    const client = this.supabase.getClient();
    try {
      const { data: newMessage, error } = await client
        .from('chat_message')
        .insert([
          {
            cm_cr_id: roomId,
            cm_usr_id: actorId,
            message_text: text,
            cm_type: 'system',
            create_at: new Date().toISOString(),
          },
        ])
        .select(
          `
          cm_id, 
          cm_cr_id,
          message_text, 
          cm_type,
          created_at,
          sender:cm_usr_id (
            usr_id, 
            usr_nama_lengkap
          ),
          chat_room:cm_cr_id (
            cr_name,
            cr_is_group,
            members:chat_room_member (
              user:crm_usr_id (
                usr_id, 
                usr_nama_lengkap
              )
            )
          )
          `,
        )
        .single();

      if (error) throw error;

      if (newMessage) {
        // Fix Room Name for Personal Chats
        if (newMessage.chat_room) {
          const room = Array.isArray(newMessage.chat_room)
            ? newMessage.chat_room[0]
            : newMessage.chat_room;

          if (!room.cr_name) {
            const members = room.members || [];
            const otherMember = members
              .flatMap((m: any) => (Array.isArray(m.user) ? m.user : [m.user]))
              .find((u: any) => u?.usr_id !== actorId);

            if (otherMember) {
              room.cr_name = otherMember.usr_nama_lengkap;
            }
          }
        }

        const transformedMessage = plainToInstance(
          ChatMessageEntity,
          newMessage,
          {
            excludeExtraneousValues: true,
            enableImplicitConversion: true,
          },
        );

        this.chatGateway.server
          .to(`room_${roomId}`)
          .emit('new_message', transformedMessage);
      }
      return true;
    } catch (error: any) {
      console.error('Failed to send system message:', error.message);
      return false;
    }
  }

  async markMessagesAsRead(
    roomId: string,
    messageIds: string[],
    userId: string,
  ) {
    const client = this.supabase.getClient();
    try {
      if (!messageIds || messageIds.length === 0) return { success: true };
      const { data: readerData, error: readerError } = await client
        .from('user')
        .select('usr_id, usr_nama_lengkap')
        .eq('usr_id', userId)
        .single();

      if (readerError) {
        throw new InternalServerErrorException(
          `Failed to fetch reader data: ${readerError.message}`,
        );
      }

      const userName = readerData?.usr_nama_lengkap || 'someone';

      const receiptsToInsert = messageIds.map((msgId) => ({
        rr_cm_id: msgId,
        rr_usr_id: userId,
        read_at: new Date().toISOString(),
      }));

      const { error } = await client
        .from('read_receipts')
        .upsert(receiptsToInsert, { onConflict: 'rr_cm_id,rr_usr_id' });

      if (error) throw error;

      // Broadcast ke pengirim pesan
      this.chatGateway.server
        .to(`room_${roomId}`)
        .emit('messages_read_update', {
          roomId,
          readerId: userId,
          readerName: userName,
          messageIds,
          readAt: new Date().toISOString(),
        });

      return { success: true };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error.message || 'Failed to mark messages as read',
      );
    }
  }

  async countUnreadMessages(roomId: string, userId: string) {
    const client = this.supabase.getClient();
    try {
      const { data: readReceipts, error: readError } = await client
        .from('read_receipts')
        .select('rr_cm_id')
        .eq('rr_usr_id', userId);

      if (readError) {
        throw new InternalServerErrorException(readError.message);
      }

      const readMessageIds = readReceipts.map((item) => item.rr_cm_id);

      if (readMessageIds.length === 0) {
        const { count, error: totalError } = await client
          .from('chat_message')
          .select('cm_id, cm_cr_id', { count: 'exact', head: true })
          .eq('cm_cr_id', roomId);

        if (totalError) throw totalError;
        return { success: true, unreadCount: count };
      }

      const { count, error: countError } = await client
        .from('chat_message')
        .select('cm_id, cm_cr_id', { count: 'exact', head: true })
        .eq('cm_cr_id', roomId)
        .not('cm_id', 'in', `(${readMessageIds.join(',')})`);

      if (countError) {
        throw new InternalServerErrorException(countError.message);
      }

      return { unreadCount: count };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to count unread messages',
      );
    }
  }

  async unsendMessage(roomId: string, messageId: string, userId: string) {
    const client = this.supabase.getClient();
    try {
      const { data, error } = await client
        .from('chat_message')
        .select('cm_usr_id')
        .eq('cm_id', messageId)
        .eq('cm_cr_id', roomId)
        .single();

      if (error) throw error;

      if (data.cm_usr_id !== userId) {
        throw new InternalServerErrorException(
          'You can only unsend your own messages.',
        );
      }

      const unsendText = '[This message was unsent]';
      const { error: deleteError } = await client
        .from('chat_message')
        .update({ message_text: unsendText })
        .eq('cm_id', messageId);

      if (deleteError) throw deleteError;

      // Broadcast message unsent to room
      this.chatGateway.server.to(`room_${roomId}`).emit('message_unsent', {
        roomId,
        messageId,
        unsendText,
        unsendBy: userId,
      });

      return { message: 'Message unsent successfully.' };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error.message || 'Failed to unsend message',
      );
    }
  }

  async searchMessages(roomId: string, query: string, userId: string) {
    try {
      const client = this.supabase.getClient();
      const { data: messages, error } = await client
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
        .eq('cm_cr_id', roomId)
        .ilike('message_text', `%${query}%`)
        .order('created_at', { ascending: true });

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      const transformedData = plainToInstance(
        ChatMessageEntity,
        messages || [],
        {
          excludeExtraneousValues: true,
          enableImplicitConversion: true,
        },
      );
      return transformedData;
    } catch (error) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to search messages',
      );
    }
  }

  async searchGlobalMessages(query: string, userId: string) {
    const client = this.supabase.getClient();
    try {
      // 1. Ambil semua Room ID di mana user menjadi member
      // gunakan subquery filter di Supabase dengan !inner join

      const { data: messages, error } = await client
        .from('chat_message')
        .select(
          `
          cm_id,
          message_text,
          created_at,
          cm_cr_id,
          chat_room:cm_cr_id!inner (
             cr_name,
             chat_room_member!inner (
                crm_usr_id
             )
          ),
          sender:cm_usr_id (
            usr_id,
            usr_nama_lengkap
          )
        `,
        )
        .eq('chat_room.chat_room_member.crm_usr_id', userId) // Filter: Hanya room saya
        .is('chat_room.deleted_at', null) // Filter: Room aktif
        .ilike('message_text', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw new InternalServerErrorException(error.message);
      }
      return plainToInstance(ChatMessageEntity, messages || [], {
        excludeExtraneousValues: true,
        enableImplicitConversion: true,
      });
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to search global messages',
      );
    }
  }
}
