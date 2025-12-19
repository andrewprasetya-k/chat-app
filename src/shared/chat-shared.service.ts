import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from 'src/Supabase/supabase.service';

@Injectable()
export class ChatSharedService {
  constructor(private readonly supabase: SupabaseService) {}

  async validateUsers(userIds: string[]) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('user')
      .select('usr_id, usr_nama_lengkap')
      .in('usr_id', userIds);

    if (error) {
      throw new InternalServerErrorException(
        'Database error during user validation',
      );
    }

    const foundIds = (data || []).map((user) => user.usr_id);
    const missingIds = userIds.filter((id) => !foundIds.includes(id));

    if (missingIds.length > 0) {
      throw new InternalServerErrorException(
        `Missing user IDs: ${missingIds.join(', ')}`,
      );
    }

    return data;
  }

  async isUserMemberOfRoom(roomId: string, userId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('chat_room_member')
      .select('crm_usr_id')
      .eq('crm_cr_id', roomId)
      .eq('crm_usr_id', userId)
      .is('leave_at', null)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return !!data;
  }

  async isUserStillInRoom(roomId: string, userId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('chat_room_member')
      .select('leave_at')
      .eq('crm_cr_id', roomId)
      .eq('crm_usr_id', userId)
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data !== null && data.leave_at === null;
  }

  async isUserAdminOfRoom(roomId: string, userId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('chat_room_member')
      .select('crm_role')
      .eq('crm_cr_id', roomId)
      .eq('crm_usr_id', userId)
      .is('leave_at', null)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data?.crm_role === 'admin';
  }

  async isGroupRoom(roomId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('chat_room')
      .select('cr_is_group')
      .eq('cr_id', roomId)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data?.cr_is_group ?? false;
  }

  async validateRoomExists(roomId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('chat_room')
      .select('cr_id')
      .eq('cr_id', roomId);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    if (!data || data.length === 0) {
      throw new InternalServerErrorException('Chat room does not exist');
    }
    return true;
  }
}
