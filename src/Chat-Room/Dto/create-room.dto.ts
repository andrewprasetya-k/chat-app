import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
  ArrayMinSize,
} from 'class-validator';

export class CreateRoomDto {
  @IsOptional()
  @IsString()
  groupName?: string; // boleh kosong kalau bukan grup

  @IsBoolean()
  @IsOptional()
  isGroup?: boolean = false; // menandai apakah room ini grup atau personal

  @IsArray()
  @ArrayMinSize(1, { message: 'Minimal harus ada 2 anggota dalam room.' })
  @IsUUID('4', {
    each: true,
    message: 'Setiap user_id harus berupa UUID valid.',
  })
  groupMembers: string[]; // daftar user_id (termasuk pembuatnya)
}
