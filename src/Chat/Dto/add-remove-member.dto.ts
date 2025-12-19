import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
  ArrayMinSize,
  isNotEmpty,
} from 'class-validator';

export class AddRemoveMemberDto {
  @IsString()
  @IsNotEmpty({ message: 'Chat room ID should not be empty' })
  chatRoomId: string; // tidak boleh kosong

  @IsString()
  @IsNotEmpty({ message: 'Actor should not be empty' })
  byWho: string; // yang melakukan aksi

  @IsArray()
  @ArrayMinSize(1, { message: 'Minimal harus ada 2 anggota dalam room.' })
  @IsUUID('4', {
    each: true,
    message: 'Setiap user_id harus berupa UUID valid.',
  })
  groupMembers: string[]; // daftar user_id
}
