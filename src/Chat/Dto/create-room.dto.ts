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
  cr_name?: string; // boleh kosong kalau bukan grup

  @IsBoolean()
  @IsOptional()
  cr_is_group?: boolean = false;

  @IsArray()
  @ArrayMinSize(1, { message: 'Minimal harus ada 2 anggota dalam room.' })
  @IsUUID('4', {
    each: true,
    message: 'Setiap user_id harus berupa UUID valid.',
  })
  members: string[]; // daftar user_id (termasuk pembuatnya)

  @IsBoolean()
  @IsOptional()
  cr_private?: boolean = false; // menandai apakah room ini room chat privat atau tidak
}
