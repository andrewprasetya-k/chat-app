import { IsUUID, IsString, IsNotEmpty } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  @IsNotEmpty()
  cm_cr_id: string; // ID room tempat pesan dikirim

  @IsUUID()
  @IsNotEmpty()
  cm_usr_id: string; // ID user pengirim pesan

  @IsString()
  @IsNotEmpty()
  message_text: string; // Isi pesan
}
