import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from 'src/Supabase/supabase.service';
import { CreateRoomDto } from '../Dto/create-room.dto';
import { ChatMessageDto, ReadByDto } from '../Dto/get-detailed-room-chat.dto';
import { getAllRoomChatDto } from '../Dto/get-all-room-chat.dto';
import { AddRemoveMemberDto } from '../Dto/add-remove-member.dto';
import { ChatSharedService } from 'src/shared/chat-shared.service';
import { GetRoomInfoDto, RoomMemberDto } from '../Dto/get-room-info.dto';

@Injectable()
export class ChatRoomService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly sharedService: ChatSharedService,
  ) {}

  async getAllRooms(userId: string) {
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

      const mappedData: getAllRoomChatDto[] = (data ?? []).map((item) => {
        const room = Array.isArray(item.chat_room)
          ? item.chat_room[0]
          : item.chat_room;
        const messages = room.chat_message ?? [];
        const lastMessage = messages.length > 0 ? messages[0] : null;
        const sender = lastMessage?.sender;

        const senderId = Array.isArray(sender)
          ? sender[0]?.usr_id
          : (sender as any)?.usr_id;
        const senderName = Array.isArray(sender)
          ? sender[0]?.usr_nama_lengkap
          : (sender as any)?.usr_nama_lengkap;

        const isLastMessageRead = lastMessage
          ? lastMessage.read_receipts.some((rr) => rr.rr_usr_id === userId)
          : false;

        return {
          roomId: room.cr_id,
          roomName: room.cr_name,
          isGroup: room.cr_is_group,
          lastMessage: lastMessage?.message_text ?? null,
          lastMessageTime: lastMessage?.created_at ?? null,
          senderId: senderId,
          senderName: senderName,
          isLastMessageRead,
        };
      });

      return mappedData;
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to fetch rooms',
      );
    }
  }

  async getRoomMessages(
    roomId: string,
    userId: string,
    beforeAt?: string,
    limit: number = 20,
  ) {
    const isInRoom = await this.sharedService.isUserStillInRoom(roomId, userId);
    const isMember = await this.sharedService.isUserMemberOfRoom(
      roomId,
      userId,
    );

    if (!isMember) {
      throw new InternalServerErrorException(
        'You are not a member of this chat room.',
      );
    }

    try {
      const client = this.supabase.getClient();
      let query = client
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

      if (!room.cr_is_group) {
        const otherUser = room.members
          .flatMap((m) => m.user)
          .find((u) => u.usr_id !== userId);

        roomName = otherUser?.usr_nama_lengkap ?? '';
      }

      const sortedMessages = (messages ?? []).reverse();

      const mappedMessages: ChatMessageDto[] = sortedMessages.map((msg) => {
        const senderRaw = msg.sender;
        const sender = Array.isArray(senderRaw) ? senderRaw[0] : senderRaw;
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
            .filter(Boolean) as ReadByDto[],
        };
      });

      return {
        roomName: roomName,
        stillInRoom: isInRoom,
        messages: mappedMessages,
      };
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

    if (dto.groupMembers.length === 2 && !isGroup) {
      const existingRoomId = await this.findExistingPersonalChat([
        groupMembers[0],
        groupMembers[1],
      ]);
      dto.groupName = '';
      dto.isGroup = false;
      if (existingRoomId) {
        return {
          success: true,
          room: { roomId: existingRoomId },
          message: 'Personal chat room already exists',
        };
      }
    } else if (dto.groupMembers.length < 2) {
      throw new InternalServerErrorException(
        'A chat must have at least 2 members',
      );
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
      const isPrivate = !dto.isGroup && dto.groupMembers.length === 2;

      const { data: room, error: roomError } = await client
        .from('chat_room')
        .insert([
          {
            cr_name: dto.groupName,
            cr_is_group: dto.isGroup,
            cr_private: isPrivate,
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

      return { success: true, roomId: room.cr_id };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error.message || 'Failed to create room',
      );
    }
  }

  async leaveRoom(roomId: string, userId: string) {
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

      return { success: true, message: 'Left the room successfully at ', now };
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
      await this.sharedService.isUserAdminOfRoom(roomId, userId);

      await this.sharedService.validateRoomExists(roomId);

      await this.sharedService.isGroupRoom(roomId);

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

      return {
        success: true,
        message: 'Members added successfully.',
        members: mappedMembers,
      };
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
      await this.sharedService.isUserAdminOfRoom(roomId, userId);

      await this.sharedService.isGroupRoom(roomId);

      await this.sharedService.validateRoomExists(roomId);

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

      return {
        success: true,
        message: 'Members removed successfully.',
        members: mappedMembers,
      };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error.message || 'Failed to remove members',
      );
    }
  }

  async deleteRoom(roomId: string, userId: string) {
    const client = this.supabase.getClient();
    try {
      if (!(await this.sharedService.isUserAdminOfRoom(roomId, userId))) {
        throw new InternalServerErrorException(
          'Only admins can delete the chat room.',
        );
      }

      if (!(await this.sharedService.isGroupRoom(roomId))) {
        throw new InternalServerErrorException(
          'Cannot delete a personal chat room.',
        );
      }

      const { error } = await client
        .from('chat_room')
        .delete()
        .eq('cr_id', roomId);

      if (error) throw error;

      return {
        success: true,
        message: 'Chat room deleted successfully.',
      };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error.message || 'Failed to delete chat room',
      );
    }
  }

  async getRoomInfo(roomId: string, userId: string): Promise<GetRoomInfoDto> {
    const client = this.supabase.getClient();
    try {
      await this.sharedService.isUserMemberOfRoom(roomId, userId);

      const { data, error } = await client
        .from('chat_room')
        .select(
          `
          cr_id,
          cr_name,
          cr_is_group,
          created_at,
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
        throw new InternalServerErrorException('Chat room not found');
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

      return {
        roomId: data.cr_id,
        roomName: data.cr_name,
        isGroup: data.cr_is_group,
        createdAt: data.created_at,
        totalMembers: activeMembers.length,
        activeMembers: activeMembers,
        pastMembers: pastMembers,
      };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to fetch room details',
      );
    }
  }

  private async findExistingPersonalChat(
    memberIds: [string, string],
  ): Promise<string | null> {
    const client = this.supabase.getClient();
    try {
      const { data, error } = await client
        .from('chat_room_member')
        .select('crm_cr_id, crm_usr_id');

      if (error) {
        throw new InternalServerErrorException(
          'Database error during room validation',
        );
      }

      if (!data || data.length === 0) {
        return null;
      }

      const membersByRoom = new Map<string, Set<string>>();

      for (const row of data) {
        const roomId = row.crm_cr_id;
        const userId = row.crm_usr_id;

        if (!membersByRoom.has(roomId)) {
          membersByRoom.set(roomId, new Set());
        }
        membersByRoom.get(roomId)!.add(userId);
      }

      for (const [roomId, userSet] of membersByRoom.entries()) {
        if (userSet.size >= 3) continue;

        const bothUsersPresent = memberIds.every((id) => userSet.has(id));
        if (bothUsersPresent) {
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
}
