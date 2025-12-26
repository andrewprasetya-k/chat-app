import { IsString, IsNotEmpty } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  text: string; // Isi pesan

  @IsString()
  replyTo?: string; // ID pesan yang dibalas (opsional)
}
