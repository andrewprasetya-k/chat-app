import { IsUUID, IsString, IsNotEmpty } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  @IsNotEmpty()
  room_id: string; // ID room tempat pesan dikirim

  @IsUUID()
  @IsNotEmpty()
  sender_id: string; // ID user pengirim pesan

  @IsString()
  @IsNotEmpty()
  message_text: string; // Isi pesan
}
