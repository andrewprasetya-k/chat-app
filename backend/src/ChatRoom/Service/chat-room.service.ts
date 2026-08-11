import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from 'src/Supabase/supabase.service';
import { CreateRoomDto } from '../Dto/create-room.dto';
import { plainToInstance } from 'class-transformer';
import {
  ChatRoomListEntity,
  ChatRoomMessagesEntity,
  ChatRoomInfoEntity,
  CreateRoomResponseEntity,
  BasicActionResponseEntity,
} from '../Entity/chat-room.entity';
import { AddRemoveMemberDto } from '../Dto/add-remove-member.dto';
import { ChatSharedService } from 'src/shared/chat-shared.service';
import { ChatService } from 'src/Chat/Service/chat.service';
import { ChatGateway } from 'src/Chat/Gateway/chat.gateway';

@Injectable()
export class ChatRoomService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly sharedService: ChatSharedService,
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  private async getAllRoomsData(userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('chat_room_member')
      .select(
        `leave_at, chat_room:crm_cr_id(cr_id, cr_name, cr_is_group, created_at, deleted_at, members:chat_room_member (user:crm_usr_id (usr_id, usr_nama_lengkap, usr_email, usr_is_online, usr_last_seen)), chat_message (cm_id, message_text, cm_type, created_at, sender:cm_usr_id (usr_id, usr_nama_lengkap), read_receipts (rr_usr_id)))`,
      )
      .eq('crm_usr_id', userId)
      .order('created_at', {
        foreignTable: 'chat_room.chat_message',
        ascending: false,
      })
      .limit(1, { foreignTable: 'chat_room.chat_message' });

    if (error) throw new InternalServerErrorException(error.message);

    return (data ?? [])
      .map((item) => {
        const room = Array.isArray(item.chat_room)
          ? item.chat_room[0]
          : item.chat_room;
        if (!room) return null;
        const lastMsg = room.chat_message?.[0];
        const sender = lastMsg?.sender;

        const members = room.members || [];
        const otherMemberRaw = members.find((m: any) => {
          const u = Array.isArray(m.user) ? m.user[0] : m.user;
          return u?.usr_id !== userId;
        });
        const otherUser = otherMemberRaw
          ? Array.isArray(otherMemberRaw.user)
            ? otherMemberRaw.user[0]
            : otherMemberRaw.user
          : null;

        return {
          roomId: room.cr_id,
          roomName: this.sharedService.getDisplayRoomName(room, userId),
          isGroup: room.cr_is_group,
          lastMessageId: lastMsg?.cm_id,
          lastMessage: lastMsg?.message_text,
          lastMessageType: lastMsg?.cm_type || 'user',
          lastMessageTime: lastMsg?.created_at || room.created_at,
          senderId: Array.isArray(sender) ? sender[0]?.usr_id : sender?.usr_id,
          senderName: Array.isArray(sender)
            ? sender[0]?.usr_nama_lengkap
            : sender?.usr_nama_lengkap,
          isLastMessageRead: (lastMsg?.read_receipts || []).some(
            (rr: any) => rr.rr_usr_id === userId,
          ),
          deletedAt: room.deleted_at,
          leaveAt: item.leave_at,
          memberCount: (room.members || []).length,
          otherUserId: otherUser?.usr_id ?? null,
          isOnline: otherUser?.usr_is_online ?? false,
          lastSeen: otherUser?.usr_last_seen ?? null,
        };
      })
      .filter(Boolean);
  }

  async getActiveRoomsNew(userId: string) {
    const all = await this.getAllRoomsData(userId);
    return this.populateUnreadAndSort(
      all.filter((r: any) => !r.leaveAt && !r.deletedAt),
      userId,
    );
  }

  async getDeactivatedRoomsNew(userId: string) {
    const all = await this.getAllRoomsData(userId);
    return this.populateUnreadAndSort(
      all.filter((r: any) => r.leaveAt || r.deletedAt),
      userId,
      true,
    );
  }

  private async populateUnreadAndSort(
    rooms: any[],
    userId: string,
    isDeactivated = false,
  ) {
    if (rooms.length === 0) return [];
    const client = this.supabase.getClient();
    const ids = rooms.map((r) => r.roomId);
    const { data: rr } = await client
      .from('read_receipts')
      .select('rr_cm_id')
      .eq('rr_usr_id', userId);
    const readSet = new Set((rr || []).map((r) => r.rr_cm_id));
    const { data: msg } = await client
      .from('chat_message')
      .select('cm_id, cm_cr_id')
      .in('cm_cr_id', ids)
      .neq('cm_usr_id', userId);

    const counts: Record<string, number> = {};
    (msg || []).forEach((m) => {
      if (!readSet.has(m.cm_id))
        counts[m.cm_cr_id] = (counts[m.cm_cr_id] || 0) + 1;
    });

    return rooms
      .map((r) => {
        const e = plainToInstance(ChatRoomListEntity, r, {
          excludeExtraneousValues: true,
          enableImplicitConversion: true,
        });
        e.unreadCount = counts[r.roomId] || 0;
        e.isDeactivated = isDeactivated;
        return e;
      })
      .sort((a, b) => {
        const tA = a.lastMessageTime
          ? new Date(a.lastMessageTime).getTime()
          : 0;
        const tB = b.lastMessageTime
          ? new Date(b.lastMessageTime).getTime()
          : 0;
        return tB - tA;
      });
  }

  async getRoomMessages(
    roomId: string,
    userId: string,
    beforeAt?: string,
    limit: number = 20,
  ) {
    const client = this.supabase.getClient();
    let q = client
      .from('chat_message')
      .select(
        `cm_id, message_text, cm_type, created_at, sender:cm_usr_id (usr_id, usr_nama_lengkap), replied_to:cm_reply_to_id (cm_id, message_text, sender:cm_usr_id (usr_id, usr_nama_lengkap)), read_receipts (reader:rr_usr_id (usr_id, usr_nama_lengkap))`,
      )
      .eq('cm_cr_id', roomId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (beforeAt) q = q.lt('created_at', beforeAt);
    const { data: msgs, error: e1 } = await q;
    if (e1) throw new InternalServerErrorException(e1.message);

    const { data: room, error: e2 } = await client
      .from('chat_room')
      .select(
        `cr_name, cr_is_group, members:chat_room_member (user:crm_usr_id (usr_id, usr_nama_lengkap))`,
      )
      .eq('cr_id', roomId)
      .maybeSingle();
    if (e2 || !room) throw new InternalServerErrorException('Room not found');

    const mapped = (msgs || []).reverse().map((m: any) => {
      const s = Array.isArray(m.sender) ? m.sender[0] : m.sender;
      const r = Array.isArray(m.replied_to) ? m.replied_to[0] : m.replied_to;
      const rs = r ? (Array.isArray(r.sender) ? r.sender[0] : r.sender) : null;
      return {
        textId: m.cm_id,
        text: m.message_text,
        type: m.cm_type,
        createdAt: m.created_at,
        sender: s
          ? { senderId: s.usr_id, senderName: s.usr_nama_lengkap }
          : null,
        replyTo: r
          ? {
              id: r.cm_id,
              text: r.message_text,
              senderName: rs?.usr_nama_lengkap || 'Unknown',
            }
          : null,
        readBy: (m.read_receipts || [])
          .map((rr: any) => {
            const u = Array.isArray(rr.reader) ? rr.reader[0] : rr.reader;
            return u
              ? { userId: u.usr_id, userName: u.usr_nama_lengkap }
              : null;
          })
          .filter(Boolean),
      };
    });
    return plainToInstance(
      ChatRoomMessagesEntity,
      {
        roomName: this.sharedService.getDisplayRoomName(room, userId),
        messages: mapped,
      },
      { excludeExtraneousValues: true, enableImplicitConversion: true },
    );
  }

  async createRoom(dto: CreateRoomDto, creatorId: string) {
    const client = this.supabase.getClient();
    const { groupName, isGroup, groupMembers = [] } = dto;
    if (!groupMembers.includes(creatorId)) groupMembers.push(creatorId);

    if (groupMembers.length <= 1) {
      const id = await this.findExistingSelfChat(groupMembers[0]);
      if (id)
        return plainToInstance(
          CreateRoomResponseEntity,
          { success: true, roomId: id, message: 'Exists' },
          { excludeExtraneousValues: true },
        );
    } else if (groupMembers.length === 2 && !isGroup) {
      const id = await this.findExistingPersonalChat([
        groupMembers[0],
        groupMembers[1],
      ]);
      if (id)
        return plainToInstance(
          CreateRoomResponseEntity,
          { success: true, roomId: id, message: 'Exists' },
          { excludeExtraneousValues: true },
        );
    }

    await this.sharedService.validateUsers(groupMembers);
    if (groupMembers.length >= 3) dto.isGroup = true;
    if (dto.isGroup && !groupName?.trim())
      throw new BadRequestException('Name required');

    const { data: room, error } = await client
      .from('chat_room')
      .insert([
        {
          cr_name: groupName,
          cr_is_group: dto.isGroup,
          cr_private: dto.isPrivate,
          created_by: creatorId,
        },
      ])
      .select()
      .single();
    if (error) throw new InternalServerErrorException(error.message);

    const membersToInsert = groupMembers.map((uid) => ({
      crm_cr_id: room.cr_id,
      crm_usr_id: uid,
      crm_role: uid === creatorId ? 'admin' : 'member',
      crm_join_approved: true,
    }));
    const { error: me } = await client
      .from('chat_room_member')
      .insert(membersToInsert);
    if (me) throw new InternalServerErrorException(me.message);

    // Fetch complete data for new_room_created event and forced WebSocket join
    const { data: fullRoom, error: fetchError } = await client
      .from('chat_room')
      .select(
        `cr_id, cr_name, cr_is_group, created_at, members:chat_room_member (user:crm_usr_id (usr_id, usr_nama_lengkap, usr_email, usr_is_online, usr_last_seen))`,
      )
      .eq('cr_id', room.cr_id)
      .single();

    if (!fetchError && fullRoom) {
      groupMembers.forEach((uid) => {
        // 1. Force WebSocket join
        this.chatGateway.forceUserToJoinRoom(uid, room.cr_id);

        // 2. Prepare payload for frontend
        const membersArr = fullRoom.members || [];
        const otherMemberRaw = membersArr.find((m: any) => {
          const u = Array.isArray(m.user) ? m.user[0] : m.user;
          return u?.usr_id !== uid;
        });
        const otherUser = otherMemberRaw
          ? Array.isArray(otherMemberRaw.user)
            ? otherMemberRaw.user[0]
            : otherMemberRaw.user
          : null;

        this.chatGateway.server.to(`user_${uid}`).emit('new_room_created', {
          roomId: room.cr_id,
          roomName: this.sharedService.getDisplayRoomName(fullRoom, uid),
          isGroup: room.cr_is_group,
          lastMessage: null,
          lastMessageTime: room.created_at,
          unreadCount: 0,
          otherUserId: otherUser?.usr_id ?? null,
          isOnline: otherUser?.usr_is_online ?? false,
          lastSeen: otherUser?.usr_last_seen ?? null,
        });
      });
    }

    if (dto.isGroup)
      await this.chatService.sendSystemMessage(
        room.cr_id,
        `Group "${groupName}" created`,
        creatorId,
      );

    return plainToInstance(
      CreateRoomResponseEntity,
      { success: true, roomId: room.cr_id },
      { excludeExtraneousValues: true },
    );
  }

  async leaveRoom(roomId: string, userId: string) {
    const client = this.supabase.getClient();
    const now = new Date().toISOString();
    const { error } = await client
      .from('chat_room_member')
      .update({ leave_at: now })
      .eq('crm_cr_id', roomId)
      .eq('crm_usr_id', userId)
      .is('leave_at', null);
    if (error) throw new InternalServerErrorException(error.message);

    const { data: u } = await client
      .from('user')
      .select('usr_nama_lengkap')
      .eq('usr_id', userId)
      .single();
    if (u)
      await this.chatService.sendSystemMessage(
        roomId,
        `${u.usr_nama_lengkap} left`,
        userId,
      );
    this.chatGateway.server.to(`room_${roomId}`).emit('member_left', {
      roomId,
      userId,
      userName: u?.usr_nama_lengkap,
      leftAt: now,
    });
    return plainToInstance(
      BasicActionResponseEntity,
      { success: true, message: 'Left', now },
      { excludeExtraneousValues: true },
    );
  }

  async addMembers(dto: AddRemoveMemberDto, userId: string, roomId: string) {
    if (!(await this.sharedService.isGroupRoom(roomId)))
      throw new BadRequestException('Groups only.');
    await this.sharedService.validateUsers(dto.members);
    await this.ensureUsersNotInRoom(roomId, dto.members);

    const members = dto.members.map((uid) => ({
      crm_cr_id: roomId,
      crm_usr_id: uid,
      crm_role: 'member',
      crm_join_approved: true,
      crm_added_by: userId,
      joined_at: new Date().toISOString(),
    }));
    const { error } = await this.supabase
      .getClient()
      .from('chat_room_member')
      .upsert(members);
    if (error) throw new InternalServerErrorException(error.message);

    const { data: room } = await this.supabase
      .getClient()
      .from('chat_room')
      .select('cr_name, created_at')
      .eq('cr_id', roomId)
      .maybeSingle();

    dto.members.forEach((uid) => {
      this.chatGateway.forceUserToJoinRoom(uid, roomId);
      this.chatGateway.server.to(`user_${uid}`).emit('new_room_created', {
        roomId,
        roomName: room?.cr_name || 'Unnamed Group',
        isGroup: true,
        lastMessage: null,
        lastMessageTime: room?.created_at || new Date().toISOString(),
        unreadCount: 0,
        otherUserId: null,
        isOnline: null,
        lastSeen: null,
      });
    });

    const { data: u } = await this.supabase
      .getClient()
      .from('user')
      .select('usr_nama_lengkap')
      .in('usr_id', dto.members);
    const { data: a } = await this.supabase
      .getClient()
      .from('user')
      .select('usr_nama_lengkap')
      .eq('usr_id', userId)
      .single();
    await this.chatService.sendSystemMessage(
      roomId,
      `${a?.usr_nama_lengkap} added ${(u || []).map((x) => x.usr_nama_lengkap).join(', ')}`,
      userId,
    );
    return { success: true };
  }

  async removeMembers(dto: AddRemoveMemberDto, userId: string, roomId: string) {
    if (!(await this.sharedService.isGroupRoom(roomId)))
      throw new BadRequestException('Groups only.');
    await this.sharedService.validateUsers(dto.members);
    await this.ensureUsersInRoom(roomId, dto.members);
    if (dto.members.includes(userId))
      throw new BadRequestException('Cannot remove self.');

    const now = new Date().toISOString();
    const { error } = await this.supabase
      .getClient()
      .from('chat_room_member')
      .update({ leave_at: now, crm_removed_by: userId })
      .eq('crm_cr_id', roomId)
      .in('crm_usr_id', dto.members);
    if (error) throw new InternalServerErrorException(error.message);

    dto.members.forEach((uid) => {
      const payload = { roomId, userId: uid, leftAt: now, removedBy: userId };
      this.chatGateway.server.to(`room_${roomId}`).emit('member_left', payload);
      this.chatGateway.server.to(`user_${uid}`).emit('member_left', payload);
      this.chatGateway.forceUserToLeaveRoom(uid, roomId);
    });

    const { data: u } = await this.supabase
      .getClient()
      .from('user')
      .select('usr_nama_lengkap')
      .in('usr_id', dto.members);
    const { data: r } = await this.supabase
      .getClient()
      .from('user')
      .select('usr_nama_lengkap')
      .eq('usr_id', userId)
      .single();
    await this.chatService.sendSystemMessage(
      roomId,
      `${r?.usr_nama_lengkap} removed ${(u || []).map((x) => x.usr_nama_lengkap).join(', ')}`,
      userId,
    );
    return { success: true };
  }

  async deleteRoom(roomId: string, userId: string) {
    if (!(await this.sharedService.isGroupRoom(roomId)))
      throw new BadRequestException('Groups only.');
    const { error } = await this.supabase
      .getClient()
      .from('chat_room')
      .update({ deleted_at: new Date().toISOString() })
      .eq('cr_id', roomId);
    if (error) throw new InternalServerErrorException(error.message);
    this.chatGateway.server.to(`room_${roomId}`).emit('room_deleted', {
      roomId,
      deletedAt: new Date().toISOString(),
      deletedBy: userId,
    });
    return { success: true };
  }

  async getRoomInfo(roomId: string, userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('chat_room')
      .select(
        `cr_id, cr_name, cr_is_group, created_at, deleted_at, members:chat_room_member (crm_usr_id, joined_at, leave_at, role:crm_role, user:crm_usr_id (usr_id, usr_nama_lengkap, usr_email))`,
      )
      .eq('cr_id', roomId)
      .maybeSingle();
    if (error || !data) throw new InternalServerErrorException('Not found');

    const members = (data.members ?? []).map((m: any) => {
      const u = Array.isArray(m.user) ? m.user[0] : m.user;
      return {
        userId: u.usr_id,
        name: u.usr_nama_lengkap,
        email: u.usr_email,
        role: m.role,
        joinedAt: m.joined_at,
        leftAt: m.leave_at,
        isMe: u.usr_id === userId,
      };
    });

    return plainToInstance(
      ChatRoomInfoEntity,
      {
        roomId: data.cr_id,
        roomName: this.sharedService.getDisplayRoomName(data, userId),
        isGroup: data.cr_is_group,
        createdAt: data.created_at,
        deletedAt: data.deleted_at,
        totalMembers: members.filter((m) => !m.leftAt).length,
        activeMembers: members.filter((m) => !m.leftAt),
        pastMembers: members.filter((m) => m.leftAt),
      },
      { excludeExtraneousValues: true, enableImplicitConversion: true },
    );
  }

  private async findExistingSelfChat(uid: string): Promise<string | null> {
    const { data } = await this.supabase
      .getClient()
      .from('chat_room_member')
      .select('crm_cr_id')
      .eq('crm_usr_id', uid)
      .is('leave_at', null);
    if (!data) return null;
    for (const r of data) {
      const { count } = await this.supabase
        .getClient()
        .from('chat_room_member')
        .select('*', { count: 'exact', head: true })
        .eq('crm_cr_id', r.crm_cr_id)
        .is('leave_at', null);
      if (count === 1) return r.crm_cr_id;
    }
    return null;
  }

  private async findExistingPersonalChat(
    uids: [string, string],
  ): Promise<string | null> {
    const { data: u1 } = await this.supabase
      .getClient()
      .from('chat_room_member')
      .select('crm_cr_id')
      .eq('crm_usr_id', uids[0])
      .is('leave_at', null);
    const { data: u2 } = await this.supabase
      .getClient()
      .from('chat_room_member')
      .select('crm_cr_id')
      .eq('crm_usr_id', uids[1])
      .is('leave_at', null);
    if (!u1 || !u2) return null;
    const s1 = new Set(u1.map((r) => r.crm_cr_id));
    for (const r2 of u2) {
      if (s1.has(r2.crm_cr_id)) {
        const { count } = await this.supabase
          .getClient()
          .from('chat_room_member')
          .select('*', { count: 'exact', head: true })
          .eq('crm_cr_id', r2.crm_cr_id)
          .is('leave_at', null);
        if (count === 2) return r2.crm_cr_id;
      }
    }
    return null;
  }

  private async ensureUsersNotInRoom(rid: string, uids: string[]) {
    const { data } = await this.supabase
      .getClient()
      .from('chat_room_member')
      .select('crm_usr_id')
      .eq('crm_cr_id', rid)
      .in('crm_usr_id', uids)
      .is('leave_at', null);
    if (data && data.length > 0)
      throw new BadRequestException('Users already members.');
  }

  private async ensureUsersInRoom(rid: string, uids: string[]) {
    const { data } = await this.supabase
      .getClient()
      .from('chat_room_member')
      .select('crm_usr_id')
      .eq('crm_cr_id', rid)
      .in('crm_usr_id', uids)
      .is('leave_at', null);
    if (!data || data.length < uids.length)
      throw new BadRequestException('Users not members.');
  }

  async promoteToAdminService(rid: string, aid: string, pid: string) {
    const { error } = await this.supabase
      .getClient()
      .from('chat_room_member')
      .update({ crm_role: 'admin' })
      .eq('crm_cr_id', rid)
      .eq('crm_usr_id', pid);
    if (error) throw new InternalServerErrorException(error.message);
    await this.broadcastRoleChange(rid, aid, pid, 'admin');
    return { success: true };
  }

  async demoteFromAdminService(rid: string, aid: string, did: string) {
    const { error } = await this.supabase
      .getClient()
      .from('chat_room_member')
      .update({ crm_role: 'member' })
      .eq('crm_cr_id', rid)
      .eq('crm_usr_id', did);
    if (error) throw new InternalServerErrorException(error.message);
    await this.broadcastRoleChange(rid, aid, did, 'member');
    return { success: true };
  }

  private async broadcastRoleChange(
    roomId: string,
    actorId: string,
    targetId: string,
    role: 'admin' | 'member',
  ) {
    const client = this.supabase.getClient();
    const { data: actor } = await client
      .from('user')
      .select('usr_nama_lengkap')
      .eq('usr_id', actorId)
      .single();
    const { data: target } = await client
      .from('user')
      .select('usr_nama_lengkap')
      .eq('usr_id', targetId)
      .single();

    const verb = role === 'admin' ? 'promoted' : 'demoted';
    await this.chatService.sendSystemMessage(
      roomId,
      `${actor?.usr_nama_lengkap} ${verb} ${target?.usr_nama_lengkap} ${role === 'admin' ? 'to admin' : 'to member'}`,
      actorId,
    );

    this.chatGateway.server
      .to(`room_${roomId}`)
      .emit('room_member_role_updated', { roomId, userId: targetId, role });
  }

  async updateGroupIconService(rid: string, file: Express.Multer.File) {
    const url = await this.supabase.uploadFile(file, 'avatars', `rooms/${rid}`);
    const { error } = await this.supabase
      .getClient()
      .from('chat_room')
      .update({ cr_avatar: url })
      .eq('cr_id', rid);
    if (error) throw new InternalServerErrorException(error.message);

    this.chatGateway.server
      .to(`room_${rid}`)
      .emit('room_icon_updated', { roomId: rid, iconUrl: url });

    return url;
  }

  async searchMessages(uid: string, query: string) {
    const { data: member } = await this.supabase
      .getClient()
      .from('chat_room_member')
      .select('crm_cr_id')
      .eq('crm_usr_id', uid)
      .is('leave_at', null);
    if (!member) return [];
    const { data: msg } = await this.supabase
      .getClient()
      .from('chat_message')
      .select(
        `cm_id, message_text, created_at, sender:cm_usr_id (usr_id, usr_nama_lengkap), chat_room:cm_cr_id (cr_id, cr_name, cr_is_group, members:chat_room_member (user:crm_usr_id (usr_id, usr_nama_lengkap)))`,
      )
      .in(
        'cm_cr_id',
        member.map((r) => r.crm_cr_id),
      )
      .ilike('message_text', `%${query}%`)
      .limit(50);
    return (msg || []).map((m: any) => {
      const r = Array.isArray(m.chat_room) ? m.chat_room[0] : m.chat_room;
      return {
        messageId: m.cm_id,
        text: m.message_text,
        createdAt: m.created_at,
        roomId: r?.cr_id,
        roomName: this.sharedService.getDisplayRoomName(r, uid),
        isGroup: r?.cr_is_group,
      };
    });
  }
}
