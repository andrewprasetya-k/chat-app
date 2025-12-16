import { IsUUID, IsString, IsNotEmpty } from 'class-validator';

export class SendMessageDto {
  success?: boolean;
  @IsString()
  @IsNotEmpty()
  text: string; // Isi pesan
}
