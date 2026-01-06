import { Expose, Type, Transform } from 'class-transformer';
import { BaseEntity } from '../../shared/entities/base.entity';
import { UserEntity } from '../../User/Entity/user.entity';

export class ChatMessageEntity extends BaseEntity {
  @Expose()
  @Transform(({ obj }) => obj.cm_id, { toClassOnly: true })
  textId: string;

  @Expose()
  @Transform(({ obj }) => obj.message_text, { toClassOnly: true })
  text: string;

  @Expose()
  @Transform(({ obj }) => obj.cm_type || 'user', { toClassOnly: true })
  type: string;
  
  @Expose()
  @Transform(({ obj }) => {
    if (!obj || !obj.sender) return null;
    const s = Array.isArray(obj.sender) ? obj.sender[0] : obj.sender;
    if (!s) return null;
    return {
      senderId: s.usr_id,
      senderName: s.usr_nama_lengkap
    };
  }, { toClassOnly: true })
  sender: any;

  @Expose()
  @Transform(({ obj }) => {
    if (!obj) return null;
    const replyRaw = obj.parent_message || obj.replied_to;
    if (!replyRaw) return null;
    
    const replyData = Array.isArray(replyRaw) ? replyRaw[0] : replyRaw;
    if (!replyData) return null;

    const senderRaw = replyData.sender;
    const replySender = Array.isArray(senderRaw) ? senderRaw[0] : senderRaw;

    return {
      id: replyData.cm_id,
      text: replyData.message_text,
      senderName: replySender?.usr_nama_lengkap || 'Unknown',
    };
  }, { toClassOnly: true })
  replyTo: any;

  @Expose()
  @Transform(({ obj }) => {
    if (!obj || !obj.read_receipts) return [];
    const receipts = Array.isArray(obj.read_receipts) ? obj.read_receipts : [];
    return receipts.map(rr => {
      if (!rr) return null;
      const reader = Array.isArray(rr.reader) ? rr.reader[0] : rr.reader;
      if (!reader) return null;
      return {
        userId: reader.usr_id,
        userName: reader.usr_nama_lengkap
      };
    }).filter(Boolean);
  }, { toClassOnly: true })
  readBy: any[];
}
