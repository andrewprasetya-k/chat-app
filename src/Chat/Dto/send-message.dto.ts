import { IsUUID, IsString, IsNotEmpty } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  message_text: string; // Isi pesan
}
