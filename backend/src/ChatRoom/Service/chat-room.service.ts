import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from 'src/Supabase/supabase.service';
import { CreateRoomDto } from '../Dto/create-room.dto';
import { plainToInstance } from 'class-transformer';
import {
  ChatRoomListEntity,
  ChatRoomMessagesEntity,
  ChatRoomInfoEntity,
  CreateRoomResponseEntity,
  MemberActionResponseEntity,
  BasicActionResponseEntity,
  SearchResponseEntity,
  SearchMessageEntity,
} from '../Entity/chat-room.entity';
import { AddRemoveMemberDto } from '../Dto/add-remove-member.dto';
import { ChatSharedService } from 'src/shared/chat-shared.service';
import { ChatService } from 'src/Chat/Service/chat.service';
import { ChatGateway } from 'src/Chat/Gateway/chat.gateway';
import { last } from 'rxjs';

@Injectable()
export class ChatRoomService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly sharedService: ChatSharedService,
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  async getActiveRooms(userId: string) {
    try {
      const client = this.supabase.getClient();

      const { data, error } = await client
        .from('chat_room_member')
        .select(
          `
          chat_room:crm_cr_id!inner(
            cr_id,
            cr_name,
            cr_is_group,
            created_at,
            deleted_at,
            members:chat_room_member (
              user:crm_usr_id (
                usr_id,
                usr_nama_lengkap,
                usr_email,
                usr_is_online,
                usr_last_seen
              )
            ),
            chat_message (
              cm_id,
              message_text,
              cm_type,
              created_at,
              sender:cm_usr_id (
                usr_id,
                usr_nama_lengkap
              ),
              read_receipts (
                rr_usr_id
              )
            )
          )
        `,
        )
        .eq('crm_usr_id', userId)
        .is('leave_at', null)
        .is('chat_room.deleted_at', null)
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

      const transformedData = (data ?? []).map((item) => {
        const room = Array.isArray(item.chat_room)
          ? item.chat_room[0]
          : item.chat_room;
        const messages = room?.chat_message ?? [];
        const lastMessage = messages.length > 0 ? messages[0] : null;
        const sender = lastMessage?.sender;
        const senderId = Array.isArray(sender)
          ? sender[0]?.usr_id
          : (sender as any)?.usr_id;
        const senderName = Array.isArray(sender)
          ? sender[0]?.usr_nama_lengkap
          : (sender as any)?.usr_nama_lengkap;

        const isLastMessageRead = lastMessage
          ? (lastMessage.read_receipts ?? []).some(
              (rr) => rr.rr_usr_id === userId,
            )
          : false;

        let roomName = room?.cr_name;
        if (!room?.cr_is_group) {
          const members = room?.members ?? [];
          const otherUser = members
            .flatMap((m) => m.user)
            .find((u) => u?.usr_id !== userId);
          roomName = otherUser?.usr_nama_lengkap ?? roomName;
        }

        const members = room?.members ?? [];
        const memberCount = members.length;
        const otherMemberRaw = members.find((m: any) => {
          const user = Array.isArray(m.user) ? m.user[0] : m.user;
          return user?.usr_id !== userId;
        });
        const otherMember = otherMemberRaw
          ? Array.isArray(otherMemberRaw.user)
            ? otherMemberRaw.user[0]
            : otherMemberRaw.user
          : null;

        return plainToInstance(
          ChatRoomListEntity,
          {
            roomId: room?.cr_id,
            roomName: roomName,
            isGroup: room?.cr_is_group,
            lastMessageId: lastMessage?.cm_id ?? null,
            lastMessage: lastMessage?.message_text ?? null,
            lastMessageType: lastMessage?.cm_type ?? 'user',
            lastMessageTime: (() => {
              const val = lastMessage?.created_at || room?.created_at;
              if (!val) return null;
              if (
                typeof val === 'string' &&
                !val.endsWith('Z') &&
                !val.includes('+')
              ) {
                return new Date(val + 'Z').toISOString();
              }
              return new Date(val).toISOString();
            })(),
            senderId: senderId ?? null,
            senderName: senderName ?? null,
            isLastMessageRead,
            deletedAt: room?.deleted_at ?? null,
            memberCount: members.length,
            otherUserId: otherMember?.usr_id ?? null,
            otherUserEmail: otherMember?.usr_email ?? null,
            isOnline: otherMember?.usr_is_online ?? null,
            lastSeen: (() => {
              const val = otherMember?.usr_last_seen;
              if (!val) return null;
              if (
                typeof val === 'string' &&
                !val.endsWith('Z') &&
                !val.includes('+')
              ) {
                return new Date(val + 'Z').toISOString();
              }
              return new Date(val).toISOString();
            })(),
          },
          {
            excludeExtraneousValues: true,
            enableImplicitConversion: true,
          },
        );
      });

      if (transformedData.length === 1 && !transformedData[0].roomId) {
        return [];
      }

      // Sort by lastMessageTime descending
      transformedData.sort((a, b) => {
        const timeA = a.lastMessageTime
          ? new Date(a.lastMessageTime).getTime()
          : 0;
        const timeB = b.lastMessageTime
          ? new Date(b.lastMessageTime).getTime()
          : 0;
        return timeB - timeA;
      });

      // Populate unreadCount for each room
      const roomsWithUnread = await Promise.all(
        transformedData.map(async (room) => {
          try {
            const { unreadCount } = await this.chatService.countUnreadMessages(
              room.roomId,
              userId,
            );
            room.unreadCount = unreadCount ?? 0;
          } catch (e) {
            room.unreadCount = 0;
          }
          return room;
        }),
      );

      return roomsWithUnread;
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to fetch rooms',
      );
    }
  }

  async getDeactivatedRooms(userId: string) {
    try {
      const client = this.supabase.getClient();

      const { data, error } = await client
        .from('chat_room_member')
        .select(
          `
          chat_room:crm_cr_id!inner(
            cr_id,
            cr_name,
            cr_is_group,
            created_at,
            deleted_at,
            members:chat_room_member (
              user:crm_usr_id (
                usr_id,
                usr_nama_lengkap
              )
            ),
            chat_message (
              cm_id,
              message_text,
              created_at,
              sender:cm_usr_id (
                usr_id,
                usr_nama_lengkap
              ),
              read_receipts (
                rr_usr_id
              )
            )
          )
        `,
        )
        .eq('crm_usr_id', userId)
        .is('leave_at', null)
        .not('chat_room.deleted_at', 'is', null) // Filter ARCHIVED only
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
      const transformedData = (data ?? []).map((item) => {
        const room = Array.isArray(item.chat_room)
          ? item.chat_room[0]
          : item.chat_room;
        const messages = room?.chat_message ?? [];
        const lastMessage = messages.length > 0 ? messages[0] : null;
        const sender = lastMessage?.sender;

        const senderId = Array.isArray(sender)
          ? sender[0]?.usr_id
          : (sender as any)?.usr_id;
        const senderName = Array.isArray(sender)
          ? sender[0]?.usr_nama_lengkap
          : (sender as any)?.usr_nama_lengkap;

        const isLastMessageRead = lastMessage
          ? (lastMessage.read_receipts ?? []).some(
              (rr) => rr.rr_usr_id === userId,
            )
          : false;

        let roomName = room?.cr_name;
        if (!room?.cr_is_group) {
          const members = room?.members ?? [];
          const otherUser = members
            .flatMap((m) => m.user)
            .find((u) => u?.usr_id !== userId);
          roomName = otherUser?.usr_nama_lengkap ?? roomName;
        }

        return plainToInstance(
          ChatRoomListEntity,
          {
            roomId: room?.cr_id,
            roomName: roomName,
            isGroup: room?.cr_is_group,
            deletedAt: room?.deleted_at ?? null,
            lastMessage: lastMessage?.message_text ?? null,
            lastMessageTime: (() => {
              const val = lastMessage?.created_at || room?.created_at;
              if (!val) return null;
              if (
                typeof val === 'string' &&
                !val.endsWith('Z') &&
                !val.includes('+')
              ) {
                return new Date(val + 'Z').toISOString();
              }
              return new Date(val).toISOString();
            })(),
            senderId: senderId ?? null,
            memberCount: room?.members ? room.members.length : 0,
            senderName: senderName ?? null,
            isLastMessageRead,
          },
          {
            excludeExtraneousValues: true,
            enableImplicitConversion: true,
          },
        );
      });

      if (transformedData.length === 1 && !transformedData[0].roomId) {
        return [];
      }

      // Sort by lastMessageTime descending
      transformedData.sort((a, b) => {
        const timeA = a.lastMessageTime
          ? new Date(a.lastMessageTime).getTime()
          : 0;
        const timeB = b.lastMessageTime
          ? new Date(b.lastMessageTime).getTime()
          : 0;
        return timeB - timeA;
      });

      // Populate unreadCount for each room
      const roomsWithUnread = await Promise.all(
        transformedData.map(async (room) => {
          try {
            const { unreadCount } = await this.chatService.countUnreadMessages(
              room.roomId,
              userId,
            );
            room.unreadCount = unreadCount ?? 0;
          } catch (e) {
            room.unreadCount = 0;
          }
          return room;
        }),
      );

      return roomsWithUnread;
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to fetch deactivated rooms',
      );
    }
  }

  async getRoomMessages(
    roomId: string,
    userId: string,
    beforeAt?: string,
    limit: number = 20,
  ) {
    try {
      const client = this.supabase.getClient();
      let query = client
        .from('chat_message')
        .select(
          `
          cm_id,
          message_text,
          cm_type,
          created_at,
          sender:cm_usr_id (
            usr_id,
            usr_nama_lengkap
          ),
          replied_to:cm_reply_to_id (
            cm_id,
            message_text,
            sender:cm_usr_id (
              usr_id,
              usr_nama_lengkap
            )
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
        .order('created_at', { ascending: false })
        .limit(limit);

      if (beforeAt) {
        query = query.lt('created_at', beforeAt);
      }

      const { data: messages, error: messageError } = await query;

      if (messageError) {
        throw new InternalServerErrorException(messageError.message);
      }

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

      let roomName = room.cr_name ?? '';

      //cek kalau personal, nama roomnya itu nama user lainnya
      if (!room.cr_is_group) {
        const otherUser = room.members
          .flatMap((m) => m.user)
          .find((u) => u.usr_id !== userId);

        roomName = otherUser?.usr_nama_lengkap ?? '';
      }

      const sortedMessages = (messages ?? []).reverse() as any[];

      const mappedMessages = sortedMessages.map((msg) => {
        const senderRaw = msg.sender;
        const sender = Array.isArray(senderRaw) ? senderRaw[0] : senderRaw;

        // Handle Reply Mapping
        const replyRaw = msg.replied_to;
        const replyData = Array.isArray(replyRaw) ? replyRaw[0] : replyRaw;

        let replyToObj: {
          id: string;
          text: string;
          senderName: string;
        } | null = null;
        if (replyData) {
          const replySenderRaw = replyData.sender;
          const replySender = Array.isArray(replySenderRaw)
            ? replySenderRaw[0]
            : replySenderRaw;

          replyToObj = {
            id: replyData.cm_id,
            text: replyData.message_text,
            senderName: replySender?.usr_nama_lengkap || 'Unknown',
          };
        }

        return {
          textId: msg.cm_id,
          text: msg.message_text,
          type: msg.cm_type,
          createdAt: msg.created_at,
          sender: sender
            ? {
                senderId: sender.usr_id,
                senderName: sender.usr_nama_lengkap,
              }
            : null,
          replyTo: replyToObj,
          readBy: (msg.read_receipts ?? [])
            .map((rr) => {
              const readerRaw = rr.reader;
              const reader = Array.isArray(readerRaw)
                ? readerRaw[0]
                : readerRaw;
              if (!reader) return null;
              return {
                userId: reader.usr_id,
                userName: reader.usr_nama_lengkap,
              };
            })
            .filter(Boolean),
        };
      });

      return plainToInstance(
        ChatRoomMessagesEntity,
        {
          roomName: roomName,
          messages: mappedMessages,
        },
        { excludeExtraneousValues: true, enableImplicitConversion: true },
      );
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to fetch messages',
      );
    }
  }

  async createRoom(dto: CreateRoomDto, creatorId: string) {
    const client = this.supabase.getClient();
    const { groupName, isGroup, groupMembers } = dto;

    dto.groupMembers = dto.groupMembers ?? [];
    if (!dto.groupMembers.includes(creatorId)) {
      dto.groupMembers.push(creatorId);
    }

    if (dto.groupMembers.length <= 1) {
      const existingRoomId = await this.findExistingSelfChat(groupMembers[0]);
      dto.groupName = 'Me';
      dto.isGroup = false;
      if (existingRoomId) {
        return plainToInstance(
          CreateRoomResponseEntity,
          {
            success: true,
            roomId: existingRoomId,
            message: 'Personal chat room already exists',
          },
          { excludeExtraneousValues: true },
        );
      }
    } else if (dto.groupMembers.length === 2 && !isGroup) {
      const existingRoomId = await this.findExistingPersonalChat([
        groupMembers[0],
        groupMembers[1],
      ]);
      dto.groupName = '';
      dto.isGroup = false;
      if (existingRoomId) {
        return plainToInstance(
          CreateRoomResponseEntity,
          {
            success: true,
            roomId: existingRoomId,
            message: 'Personal chat room already exists',
          },
          { excludeExtraneousValues: true },
        );
      }
    }

    await this.sharedService.validateUsers(dto.groupMembers);

    if (dto.groupMembers.length >= 3) {
      dto.isGroup = true;
    }
    if (dto.isGroup && dto.groupName?.trim() === '') {
      throw new InternalServerErrorException(
        'Group chat must have a valid name',
      );
    }

    try {
      const isPrivate = dto.isGroup && dto.groupMembers.length === 2;
      const privateGroup = isPrivate ? true : dto.isPrivate;

      const { data: room, error: roomError } = await client
        .from('chat_room')
        .insert([
          {
            cr_name: dto.groupName,
            cr_is_group: dto.isGroup,
            cr_private: privateGroup,
            created_by: creatorId,
          },
        ])
        .select()
        .single();

      if (roomError) throw roomError;

      const membersToInsert = groupMembers.map((usr_id) => {
        let userRole = 'member';
        if (isPrivate) {
          userRole = 'personal';
        } else if (usr_id === creatorId) {
          userRole = 'admin';
        }

        return {
          crm_cr_id: room.cr_id,
          crm_usr_id: usr_id,
          crm_role: userRole,
          crm_join_approved: true,
        };
      });

      const { error: memberError } = await client
        .from('chat_room_member')
        .insert(membersToInsert);

      if (memberError) throw memberError;

      // System Message: Room Created
      if (dto.isGroup) {
        await this.chatService.sendSystemMessage(
          room.cr_id,
          `Group "${dto.groupName}" created`,
          creatorId,
        );
      }

      for (const memberId of groupMembers) {
        this.chatGateway.server
          .to(`user_${memberId}`)
          .emit('new_room_created', {
            roomId: room.cr_id,
            roomName: dto.groupName,
            isGroup: dto.isGroup,
            lastMessage: null,
            lastMessageTime: new Date().toISOString(),
            unreadCount: 0,
            otherUserId: dto.groupMembers.find((id) => id !== memberId)
              ? dto.groupMembers.find((id) => id !== memberId)
              : null,
          });
      }

      return plainToInstance(
        CreateRoomResponseEntity,
        { success: true, roomId: room.cr_id },
        { excludeExtraneousValues: true },
      );
    } catch (error: any) {
      throw new InternalServerErrorException(
        error.message || 'Failed to create room',
      );
    }
  }

  async leaveRoom(roomId: string, userId: string) {
    const client = this.supabase.getClient();
    try {
      const now = new Date().toISOString();
      const { error } = await client
        .from('chat_room_member')
        .update({ leave_at: now })
        .eq('crm_cr_id', roomId)
        .eq('crm_usr_id', userId)
        .is('leave_at', null);

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      // System Message
      const { data: userData } = await client
        .from('user')
        .select('usr_nama_lengkap')
        .eq('usr_id', userId)
        .single();
      if (userData) {
        await this.chatService.sendSystemMessage(
          roomId,
          `${userData.usr_nama_lengkap} left the room`,
          userId,
        );
      }

      // Broadcast member left
      this.chatGateway.server.to(`room_${roomId}`).emit('member_left', {
        roomId,
        userId,
        userName: userData?.usr_nama_lengkap,
        leftAt: now,
      });

      return plainToInstance(
        BasicActionResponseEntity,
        {
          success: true,
          message: 'Left the room successfully',
          now,
        },
        { excludeExtraneousValues: true },
      );
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to leave room',
      );
    }
  }

  async addMembers(dto: AddRemoveMemberDto, userId: string, roomId: string) {
    const { members } = dto;
    const client = this.supabase.getClient();
    try {
      if (!(await this.sharedService.isGroupRoom(roomId))) {
        throw new InternalServerErrorException(
          'Cannot perform this action on a personal chat room.',
        );
      }

      await this.sharedService.validateUsers(members);

      await this.ensureUsersNotInRoom(roomId, members);

      const membersToInsert = members.map((usr_id) => ({
        crm_cr_id: roomId,
        crm_usr_id: usr_id,
        crm_role: 'member',
        crm_join_approved: true,
        crm_added_by: userId,
        joined_at: new Date().toISOString(),
        leave_at: null,
        crm_removed_by: null,
      }));

      const { error: memberError } = await client
        .from('chat_room_member')
        .upsert(membersToInsert);

      if (memberError) throw memberError;

      const { data: addedMembers, error: fetchError } = await client
        .from('user')
        .select('usr_nama_lengkap')
        .in('usr_id', members);

      if (fetchError) throw fetchError;

      const mappedMembers = (addedMembers || []).map((user) => ({
        memberName: user.usr_nama_lengkap,
      }));

      // System Message
      const { data: adderData } = await client
        .from('user')
        .select('usr_nama_lengkap')
        .eq('usr_id', userId)
        .single();
      const addedNames = mappedMembers.map((m) => m.memberName).join(', ');
      await this.chatService.sendSystemMessage(
        roomId,
        `${adderData?.usr_nama_lengkap || 'Someone'} added ${addedNames}`,
        userId,
      );

      return plainToInstance(
        MemberActionResponseEntity,
        {
          success: true,
          message: 'Members added successfully.',
          members: mappedMembers,
        },
        { excludeExtraneousValues: true, enableImplicitConversion: true },
      );
    } catch (error: any) {
      throw new InternalServerErrorException(
        error.message || 'Failed to add members',
      );
    }
  }

  async removeMembers(dto: AddRemoveMemberDto, userId: string, roomId: string) {
    const { members } = dto;
    const client = this.supabase.getClient();
    try {
      if (!(await this.sharedService.isGroupRoom(roomId))) {
        throw new InternalServerErrorException(
          'Cannot perform this action on a personal chat room.',
        );
      }

      await this.sharedService.validateUsers(members);

      await this.ensureUsersInRoom(roomId, members);

      if (members.includes(userId)) {
        throw new InternalServerErrorException(
          'Admins cannot remove themselves from the chat room.',
        );
      }

      const { error: memberError } = await client
        .from('chat_room_member')
        .update({ leave_at: new Date().toISOString(), crm_removed_by: userId })
        .eq('crm_cr_id', roomId)
        .in('crm_usr_id', members);

      if (memberError) throw memberError;

      const { data: removedMembers, error: fetchError } = await client
        .from('user')
        .select('usr_nama_lengkap')
        .in('usr_id', members);

      if (fetchError) throw fetchError;

      const mappedMembers = (removedMembers || []).map((user) => ({
        memberName: user.usr_nama_lengkap,
      }));

      // System Message
      const { data: removerData } = await client
        .from('user')
        .select('usr_nama_lengkap')
        .eq('usr_id', userId)
        .single();
      const removedNames = mappedMembers.map((m) => m.memberName).join(', ');
      await this.chatService.sendSystemMessage(
        roomId,
        `${removerData?.usr_nama_lengkap || 'Someone'} removed ${removedNames}`,
        userId,
      );

      return plainToInstance(
        MemberActionResponseEntity,
        {
          success: true,
          message: 'Members removed successfully.',
          members: mappedMembers,
        },
        { excludeExtraneousValues: true, enableImplicitConversion: true },
      );
    } catch (error: any) {
      throw new InternalServerErrorException(
        error.message || 'Failed to remove members',
      );
    }
  }

  async deleteRoom(roomId: string, userId: string) {
    const client = this.supabase.getClient();
    try {
      if (!(await this.sharedService.isGroupRoom(roomId))) {
        throw new InternalServerErrorException(
          'Cannot delete a personal chat room.',
        );
      }

      const deletedAt = new Date().toISOString();
      const { error } = await client
        .from('chat_room')
        .update({ deleted_at: deletedAt })
        .eq('cr_id', roomId);

      if (error) throw error;

      // Broadcast room deleted to all members
      this.chatGateway.server.to(`room_${roomId}`).emit('room_deleted', {
        roomId,
        deletedAt,
        deletedBy: userId,
      });

      return plainToInstance(
        BasicActionResponseEntity,
        {
          success: true,
          message: 'Chat room deleted successfully.',
        },
        { excludeExtraneousValues: true },
      );
    } catch (error: any) {
      throw new InternalServerErrorException(
        error.message || 'Failed to delete chat room',
      );
    }
  }

  async getRoomInfo(roomId: string, userId: string) {
    const client = this.supabase.getClient();
    try {
      const { data, error } = await client
        .from('chat_room')
        .select(
          `
          cr_id,
          cr_name,
          cr_is_group,
          created_at,
          deleted_at,
          members:chat_room_member (
            crm_usr_id,
            joined_at,
            leave_at,
            role:crm_role,
            user:crm_usr_id (
              usr_id,
              usr_nama_lengkap,
              usr_email
            )
          )
        `,
        )
        .eq('cr_id', roomId)
        .maybeSingle();

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      if (!data) {
        throw new InternalServerErrorException(
          'Chat room not found or deleted',
        );
      }

      let roomName = data.cr_name;
      if (!data.cr_is_group) {
        const otherMember = (data.members ?? []).find(
          (m: any) => m.crm_usr_id !== userId,
        );
        const otherUser = otherMember
          ? Array.isArray(otherMember.user)
            ? otherMember.user[0]
            : otherMember.user
          : null;
        roomName = otherUser?.usr_nama_lengkap || 'Personal Chat';
      }

      const allMembers = (data.members ?? []).map((m: any) => {
        const user = Array.isArray(m.user) ? m.user[0] : m.user;
        return {
          userId: user.usr_id,
          name: user.usr_nama_lengkap,
          email: user.usr_email,
          role: m.role,
          joinedAt: m.joined_at,
          leftAt: m.leave_at,
          isMe: user.usr_id === userId,
        };
      });

      const activeMembers = allMembers
        .filter((m) => m.leftAt === null)
        .sort((a, b) => {
          if (a.role === 'admin' && b.role !== 'admin') return -1;
          if (a.role !== 'admin' && b.role === 'admin') return 1;
          return a.name.localeCompare(b.name);
        });

      const pastMembers = allMembers
        .filter((m) => m.leftAt !== null)
        .sort((a, b) => {
          return new Date(b.leftAt!).getTime() - new Date(a.leftAt!).getTime();
        });

      return plainToInstance(
        ChatRoomInfoEntity,
        {
          roomId: data.cr_id,
          roomName: roomName,
          isGroup: data.cr_is_group,
          createdAt: data.created_at,
          deletedAt: data.deleted_at ?? null,
          totalMembers: activeMembers.length,
          activeMembers: activeMembers,
          pastMembers: pastMembers,
        },
        { excludeExtraneousValues: true, enableImplicitConversion: true },
      );
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to fetch room details',
      );
    }
  }

  private async findExistingSelfChat(memberId: string): Promise<string | null> {
    const client = this.supabase.getClient();
    try {
      // Step 1: Get all rooms where this user is a member
      const { data: userRooms, error: roomsError } = await client
        .from('chat_room_member')
        .select('crm_cr_id')
        .eq('crm_usr_id', memberId)
        .is('leave_at', null);

      if (roomsError) {
        throw new InternalServerErrorException(
          'Database error during self chat validation',
        );
      }

      if (!userRooms || userRooms.length === 0) {
        return null;
      }

      // Step 2: For each room, check if it only has 1 member (self chat)
      for (const room of userRooms) {
        const { count, error: countError } = await client
          .from('chat_room_member')
          .select('*', { count: 'exact', head: true })
          .eq('crm_cr_id', room.crm_cr_id)
          .is('leave_at', null);

        if (countError) continue;

        // If room has exactly 1 member, it's a self chat
        if (count === 1) {
          return room.crm_cr_id;
        }
      }

      return null;
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to validate self chat',
      );
    }
  }

  private async findExistingPersonalChat(
    memberIds: [string, string],
  ): Promise<string | null> {
    const client = this.supabase.getClient();
    try {
      const [userId1, userId2] = memberIds;

      // Step 1: Get all rooms where first user is a member
      const { data: user1Rooms, error: user1Error } = await client
        .from('chat_room_member')
        .select('crm_cr_id')
        .eq('crm_usr_id', userId1)
        .is('leave_at', null);

      if (user1Error) {
        throw new InternalServerErrorException(
          'Database error during room validation',
        );
      }

      if (!user1Rooms || user1Rooms.length === 0) {
        return null;
      }

      // Step 2: Get all rooms where second user is a member
      const { data: user2Rooms, error: user2Error } = await client
        .from('chat_room_member')
        .select('crm_cr_id')
        .eq('crm_usr_id', userId2)
        .is('leave_at', null);

      if (user2Error) {
        throw new InternalServerErrorException(
          'Database error during room validation',
        );
      }

      if (!user2Rooms || user2Rooms.length === 0) {
        return null;
      }

      // Step 3: Find common rooms (where both users are members)
      const user1RoomIds = new Set(user1Rooms.map((r) => r.crm_cr_id));
      const commonRoomIds = user2Rooms
        .map((r) => r.crm_cr_id)
        .filter((roomId) => user1RoomIds.has(roomId));

      if (commonRoomIds.length === 0) {
        return null;
      }

      // Step 4: Check each common room to find one with exactly 2 members
      for (const roomId of commonRoomIds) {
        const { count, error: countError } = await client
          .from('chat_room_member')
          .select('*', { count: 'exact', head: true })
          .eq('crm_cr_id', roomId)
          .is('leave_at', null);

        if (countError) continue;

        // If room has exactly 2 members, it's a personal chat
        if (count === 2) {
          return roomId;
        }
      }

      return null;
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to validate room',
      );
    }
  }

  private async ensureUsersNotInRoom(roomId: string, userIds: string[]) {
    const client = this.supabase.getClient();
    try {
      const { data, error } = await client
        .from('chat_room_member')
        .select(`crm_usr_id, user:crm_usr_id (usr_nama_lengkap)`)
        .eq('crm_cr_id', roomId)
        .in('crm_usr_id', userIds)
        .is('leave_at', null);

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      const existingMembers = (data || []).map((member) => ({
        id: member.crm_usr_id,
        name: Array.isArray(member.user)
          ? member.user[0]?.usr_nama_lengkap
          : (member.user as any)?.usr_nama_lengkap,
      }));

      const alreadyMemberIds = existingMembers.map((m) => m.id);
      const alreadyMembers = userIds.filter((id) =>
        alreadyMemberIds.includes(id),
      );

      if (alreadyMembers.length > 0) {
        const memberNames = existingMembers
          .filter((m) => alreadyMembers.includes(m.id))
          .map((m) => m.name)
          .join(', ');

        throw new InternalServerErrorException(
          `One or more users are already members of the chat room. Member: ${memberNames}`,
        );
      }

      return true;
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to validate room members',
      );
    }
  }

  private async ensureUsersInRoom(roomId: string, userIds: string[]) {
    const client = this.supabase.getClient();
    try {
      const { data, error } = await client
        .from('chat_room_member')
        .select(`crm_usr_id, user:crm_usr_id (usr_nama_lengkap)`)
        .eq('crm_cr_id', roomId)
        .in('crm_usr_id', userIds)
        .is('leave_at', null);

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      const existingMemberIds = (data || []).map((member) => member.crm_usr_id);
      const notMembers = userIds.filter(
        (id) => !existingMemberIds.includes(id),
      );

      if (notMembers.length > 0) {
        const { data: userNotMembers, error: userError } = await client
          .from('user')
          .select('usr_id, usr_nama_lengkap')
          .in('usr_id', notMembers);

        if (userError) {
          throw new InternalServerErrorException(userError.message);
        }

        const memberNames = (userNotMembers || [])
          .map((u) => u.usr_nama_lengkap)
          .join(', ');

        throw new InternalServerErrorException(
          `One or more users are not members of the chat room. User: ${memberNames}`,
        );
      }

      return true;
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to validate room members',
      );
    }
  }

  async joinRoomService(roomId: string, userId: string) {
    const client = this.supabase.getClient();

    try {
      if (!(await this.sharedService.isGroupRoom(roomId))) {
        throw new InternalServerErrorException(
          'You can only join group rooms.',
        );
      }

      await this.sharedService.validateRoomExists(roomId);

      await this.sharedService.validateUsers([userId]);

      await this.ensureUsersNotInRoom(roomId, [userId]);

      const isPrivate = await this.sharedService.isGroupPrivateRoom(roomId);

      const approvedToJoin = !isPrivate;

      // if (error) {
      //   throw new InternalServerErrorException(error.message);
      // }

      if (approvedToJoin) {
        const { data: userData } = await client
          .from('user')
          .select('usr_nama_lengkap')
          .eq('usr_id', userId)
          .single();
        await this.chatService.sendSystemMessage(
          roomId,
          `${userData?.usr_nama_lengkap || 'Someone'} joined the group`,
          userId,
        );
      }

      return {
        success: true,

        message: approvedToJoin
          ? 'Joined room successfully'
          : 'Join request sent, awaiting approval',
      };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to join room',
      );
    }
  }

  async approveJoinRequestService(
    roomId: string,
    requesterId: string,
    adminId: string,
  ) {
    const client = this.supabase.getClient();

    try {
      const { error } = await client
        .from('chat_room_member')
        .update({
          crm_join_approved: true,
          crm_added_approved_by: adminId,
        })
        .eq('crm_cr_id', roomId)
        .eq('crm_usr_id', requesterId)
        .is('crm_join_approved', false);

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      // System Message
      const { data: userData } = await client
        .from('user')
        .select('usr_nama_lengkap')
        .eq('usr_id', requesterId)
        .single();
      await this.chatService.sendSystemMessage(
        roomId,
        `${userData?.usr_nama_lengkap || 'Someone'} joined the group`,
        adminId,
      );

      return {
        success: true,
        message: 'Join request approved successfully',
      };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to approve join request',
      );
    }
  }

  async rejectJoinRequestService(
    roomId: string,
    requesterId: string,
    adminId: string,
  ) {
    const client = this.supabase.getClient();

    try {
      const { error } = await client
        .from('chat_room_member')
        .delete()
        .eq('crm_cr_id', roomId)
        .eq('crm_usr_id', requesterId)
        .is('crm_join_approved', false);

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      return {
        success: true,
        message: 'Join request declined successfully',
      };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to decline join request',
      );
    }
  }

  async promoteToAdminService(
    roomId: string,
    userId: string,
    promoteUserId: string,
  ) {
    const client = this.supabase.getClient();

    try {
      const isMember = await this.sharedService.isUserMemberOfRoom(
        roomId,
        promoteUserId,
      );
      if (!isMember) {
        throw new InternalServerErrorException(
          'The user to be promoted is not a member of this chat room.',
        );
      }

      const isMemberAdmin = await this.sharedService.isUserAdminOfRoom(
        roomId,
        promoteUserId,
      );
      if (isMemberAdmin) {
        throw new InternalServerErrorException(
          'The user is already an admin of this chat room.',
        );
      }

      const { error } = await client
        .from('chat_room_member')
        .update({ crm_role: 'admin' })
        .eq('crm_cr_id', roomId)
        .eq('crm_usr_id', promoteUserId)
        .is('leave_at', null);

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      // System Message
      const { data: usersData } = await client
        .from('user')
        .select('usr_id, usr_nama_lengkap')
        .in('usr_id', [userId, promoteUserId]);

      const adminName = usersData?.find(
        (u) => u.usr_id === userId,
      )?.usr_nama_lengkap;
      const targetName = usersData?.find(
        (u) => u.usr_id === promoteUserId,
      )?.usr_nama_lengkap;

      await this.chatService.sendSystemMessage(
        roomId,
        `${adminName} promoted ${targetName} to admin`,
        userId,
      );

      // Broadcast role change
      this.chatGateway.server.to(`room_${roomId}`).emit('member_role_changed', {
        roomId,
        userId: promoteUserId,
        userName: targetName,
        newRole: 'admin',
        changedBy: userId,
        changedByName: adminName,
      });

      return {
        success: true,
        message: 'Member promoted to admin successfully',
      };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to promote member to admin',
      );
    }
  }

  async demoteFromAdminService(
    roomId: string,
    userId: string,
    demoteUserId: string,
  ) {
    const client = this.supabase.getClient();

    try {
      const isMemberAdmin = await this.sharedService.isUserAdminOfRoom(
        roomId,
        demoteUserId,
      );
      if (!isMemberAdmin) {
        throw new InternalServerErrorException(
          'The user is not an admin of this chat room.',
        );
      }

      const { error } = await client
        .from('chat_room_member')
        .update({ crm_role: 'member' })
        .eq('crm_cr_id', roomId)
        .eq('crm_usr_id', demoteUserId)
        .is('leave_at', null);

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      // System Message
      const { data: usersData } = await client
        .from('user')
        .select('usr_id, usr_nama_lengkap')
        .in('usr_id', [userId, demoteUserId]);

      const adminName = usersData?.find(
        (u) => u.usr_id === userId,
      )?.usr_nama_lengkap;
      const targetName = usersData?.find(
        (u) => u.usr_id === demoteUserId,
      )?.usr_nama_lengkap;

      await this.chatService.sendSystemMessage(
        roomId,
        `${adminName} demoted ${targetName} to member`,
        userId,
      );

      // Broadcast role change
      this.chatGateway.server.to(`room_${roomId}`).emit('member_role_changed', {
        roomId,
        userId: demoteUserId,
        userName: targetName,
        newRole: 'member',
        changedBy: userId,
        changedByName: adminName,
      });

      return {
        success: true,
        message: 'Admin demoted to member successfully',
      };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to demote admin to member',
      );
    }
  }

  async updateGroupIcon(roomId: string, iconUrl: string) {
    const client = this.supabase.getClient();
    try {
      const { error } = await client
        .from('chat_room')
        .update({ cr_avatar: iconUrl })
        .eq('cr_id', roomId);

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      return { success: true };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to update group icon',
      );
    }
  }

  async searchMessages(userId: string, query: string) {
    const client = this.supabase.getClient();
    try {
      // Step 1: Get Room IDs where the user is currently a member
      const { data: memberData, error: memberError } = await client
        .from('chat_room_member')
        .select('crm_cr_id')
        .eq('crm_usr_id', userId)
        .is('leave_at', null);

      if (memberError) throw memberError;

      const roomIds = memberData.map((r) => r.crm_cr_id);

      if (roomIds.length === 0) return [];

      // Step 2: Search messages in those rooms
      const { data: messagesData, error: messagesError } = await client
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
          chat_room:cm_cr_id (
            cr_id,
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
        .in('cm_cr_id', roomIds)
        .ilike('message_text', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (messagesError) throw messagesError;

      return messagesData.map((msg: any) => {
        const senderRaw = msg.sender;
        const sender = Array.isArray(senderRaw) ? senderRaw[0] : senderRaw;

        const roomRaw = msg.chat_room;
        const room = Array.isArray(roomRaw) ? roomRaw[0] : roomRaw;

        let roomName = room?.cr_name || 'Unknown Room';

        // Fix room name for personal chats
        if (!room?.cr_is_group && room?.members) {
          const members = Array.isArray(room.members)
            ? room.members
            : [room.members];
          const otherUser = members
            .flatMap((m: any) => (Array.isArray(m.user) ? m.user : [m.user]))
            .find((u: any) => u?.usr_id !== userId);

          if (otherUser) {
            roomName = otherUser.usr_nama_lengkap;
          }
        }

        return {
          messageId: msg.cm_id,
          text: msg.message_text,
          createdAt: msg.created_at,
          roomId: room?.cr_id,
          roomName: roomName,
          isGroup: room?.cr_is_group,
          senderId: sender?.usr_id,
          senderName: sender?.usr_nama_lengkap,
        };
      });
    } catch (error: any) {
      // Log error but return empty array to avoid breaking the whole search
      // console.error('Search messages error:', error);
      return [];
    }
  }
}
