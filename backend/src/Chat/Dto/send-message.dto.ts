import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  text: string; // Isi pesan

  @IsString()
  @IsOptional()
  replyTo?: string; // ID pesan yang dibalas (opsional)
}
