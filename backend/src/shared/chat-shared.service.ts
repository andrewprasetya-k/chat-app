import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { SupabaseService } from 'src/Supabase/supabase.service';
import { UserEntity } from 'src/User/Entity/user.entity';

@Injectable()
export class ChatSharedService {
  constructor(private readonly supabase: SupabaseService) {}

  async validateUsers(userIds: string[]) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('user')
      .select('usr_id, usr_nama_lengkap')
      .in('usr_id', userIds);
    if (error)
      throw new InternalServerErrorException(
        'Database error during user validation',
      );
    const foundIds = (data || []).map((user) => user.usr_id);
    const missingIds = userIds.filter((id) => !foundIds.includes(id));
    if (missingIds.length > 0)
      throw new InternalServerErrorException(
        `Missing user IDs: ${missingIds.join(', ')}`,
      );
    return plainToInstance(UserEntity, data, { excludeExtraneousValues: true });
  }

  async isUserMemberOfRoom(roomId: string, userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('chat_room_member')
      .select('crm_usr_id')
      .eq('crm_cr_id', roomId)
      .eq('crm_usr_id', userId)
      .is('leave_at', null)
      .maybeSingle();
    if (error) throw new InternalServerErrorException(error.message);
    return !!data;
  }

  async isUserAdminOfRoom(roomId: string, userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('chat_room_member')
      .select('crm_role')
      .eq('crm_cr_id', roomId)
      .eq('crm_usr_id', userId)
      .is('leave_at', null)
      .maybeSingle();
    if (error) throw new InternalServerErrorException(error.message);
    return data?.crm_role === 'admin';
  }

  async isGroupRoom(roomId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('chat_room')
      .select('cr_is_group')
      .eq('cr_id', roomId)
      .maybeSingle();
    if (error) throw new InternalServerErrorException(error.message);
    return data?.cr_is_group ?? false;
  }

  async validateRoomExists(roomId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('chat_room')
      .select('cr_id')
      .eq('cr_id', roomId);
    if (error) throw new InternalServerErrorException(error.message);
    if (!data || data.length === 0)
      throw new InternalServerErrorException('Chat room does not exist');
    return true;
  }

  async isGroupPrivateRoom(roomId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('chat_room')
      .select('cr_is_group, cr_private')
      .eq('cr_id', roomId)
      .maybeSingle();
    if (error) throw new InternalServerErrorException(error.message);
    return data?.cr_is_group && data?.cr_private;
  }

  async getRoomStatus(roomId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('chat_room')
      .select('cr_id, deleted_at')
      .eq('cr_id', roomId)
      .maybeSingle();
    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async getUserActiveRoomIds(userId: string): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .getClient()
        .from('chat_room_member')
        .select('crm_cr_id')
        .eq('crm_usr_id', userId)
        .is('leave_at', null);
      if (error) throw error;
      return (data || []).map((item) => item.crm_cr_id);
    } catch (error) {
      return [];
    }
  }

  getDisplayRoomName(
    room: { cr_name?: string; cr_is_group?: boolean; members?: any[] },
    currentUserId: string,
  ): string {
    if (room.cr_is_group) return room.cr_name || 'Unnamed Group';
    const other = (room.members || []).find((m: any) => {
      const user = Array.isArray(m.user) ? m.user[0] : m.user;
      return (user?.usr_id || m.crm_usr_id) !== currentUserId;
    });
    const u = other
      ? Array.isArray(other.user)
        ? other.user[0]
        : other.user
      : null;
    return u?.usr_nama_lengkap || room.cr_name || 'Personal Chat';
  }
}
