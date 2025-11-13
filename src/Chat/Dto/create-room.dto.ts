import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class CreateRoomDto {
  @IsOptional()
  @IsString()
  room_name?: string; // boleh kosong kalau bukan grup

  @IsBoolean()
  @IsOptional()
  is_group?: boolean = false;

  @IsArray()
  @ArrayMinSize(2, { message: 'Minimal harus ada 2 anggota dalam room.' })
  @IsUUID('4', { each: true, message: 'Setiap user_id harus berupa UUID valid.' })
  members: string[]; // daftar user_id (termasuk pembuatnya)
}