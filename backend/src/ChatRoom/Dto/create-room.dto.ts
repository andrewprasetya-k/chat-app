import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoomDto {
  @IsOptional()
  @IsString()
  groupName?: string; // boleh kosong kalau bukan grup

  @IsBoolean()
  @IsOptional()
  isGroup?: boolean = false; // menandai apakah room ini grup atau personal

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean = false; // menandai apakah room ini private atau tidak

  @IsArray()
  @ArrayMinSize(0, { message: 'Minimal harus ada 1 anggota dalam room.' })
  @IsUUID('4', {
    each: true,
    message: 'Setiap user_id harus berupa UUID valid.',
  })
  @Type(() => String)
  groupMembers: string[]; // daftar user_id (termasuk pembuatnya)
}
