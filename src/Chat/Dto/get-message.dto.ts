import { IsUUID, IsString, IsNotEmpty } from 'class-validator';

export class GetMessageDto {
  @IsUUID()
  @IsNotEmpty()
  cm_cr_id: string; // ID room tempat pesan dikirim
}
