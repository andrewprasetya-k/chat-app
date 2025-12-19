import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from 'src/Supabase/supabase.service';
import { SendMessageDto } from '../Dto/send-message.dto';
import { ChatSharedService } from 'src/shared/chat-shared.service';
import { TransformUtil } from 'src/shared';
import { ChatMessageEntity } from '../Entity/chat.entity';

@Injectable()
export class ChatService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly sharedService: ChatSharedService,
  ) {}

  async sendMessage(dto: SendMessageDto, roomId: string, userId: string) {
    try {
      const inRoom = await this.sharedService.isUserStillInRoom(roomId, userId);
      const isMember = await this.sharedService.isUserMemberOfRoom(
        roomId,
        userId,
      );

      if (!isMember) {
        throw new InternalServerErrorException(
          'You are not a member of this chat room.',
        );
      }
      if (!inRoom) {
        throw new InternalServerErrorException(
          'You have left the chat room and cannot send messages.',
        );
      }

      const { text } = dto;
      if (!text || text.trim() === '') {
        throw new InternalServerErrorException('Message text cannot be empty.');
      }

      const client = this.supabase.getClient();
      const { data: newMessage, error } = await client
        .from('chat_message')
        .insert([
          {
            cm_cr_id: roomId,
            cm_usr_id: userId,
            message_text: text,
          },
        ])
        .select(
          `cm_id, message_text, created_at, sender:cm_usr_id (usr_id, usr_nama_lengkap)`,
        )
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new InternalServerErrorException(
          `Database error: ${error.message}`,
        );
      }

      if (newMessage) {
        try {
          const channelName = `chat_room_${roomId}`;
          const channel = client.channel(channelName);
          await (channel as any).httpSend({
            type: 'broadcast',
            event: 'new_message',
            payload: newMessage,
          });
        } catch (broadcastError) {
          console.error('Broadcast error:', broadcastError);
          // Don't throw error for broadcast failure, message was saved successfully
        }
      }

      return { success: true, text: newMessage.message_text };
    } catch (error: any) {
      console.error('SendMessage error:', error);
      throw new InternalServerErrorException(
        error?.message || 'Failed to send message',
      );
    }
  }

  async markMessageAsRead(roomId: string, messageId: string, userId: string) {
    const isMember = await this.sharedService.isUserMemberOfRoom(
      roomId,
      userId,
    );
    if (!isMember) {
      throw new InternalServerErrorException(
        'You are not a member of this chat room.',
      );
    }

    const client = this.supabase.getClient();
    try {
      const { data: messageData, error: msgError } = await client
        .from('chat_message')
        .select('cm_usr_id')
        .eq('cm_id', messageId)
        .single();

      if (msgError) throw msgError;

      if (messageData.cm_usr_id === userId) {
        throw new InternalServerErrorException(
          'You cannot mark your own message as read',
        );
      }

      const { error: upsertError } = await client.from('read_receipts').upsert(
        {
          rr_cm_id: messageId,
          rr_usr_id: userId,
          read_at: new Date().toISOString(),
        },
        { onConflict: 'rr_cm_id,rr_usr_id' },
      );

      if (upsertError) throw upsertError;

      return { success: true, message: 'Message marked as read.' };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error.message || 'Failed to mark message as read',
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

      return { success: true, unreadCount: count };
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
        .single();

      const inRoom = await this.sharedService.isUserStillInRoom(roomId, userId);
      if (!inRoom) {
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

  async searchMessages(roomId: string, query: string, userId: string) {
    try {
      const isMember = await this.sharedService.isUserMemberOfRoom(
        roomId,
        userId,
      );
      if (!isMember) {
        throw new InternalServerErrorException(
          'You are not a member of this chat room.',
        );
      }

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

      // Use entity transformation instead of manual mapping
      return TransformUtil.transform(ChatMessageEntity, messages || []);
    } catch (error) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to search messages',
      );
    }
  }
}
