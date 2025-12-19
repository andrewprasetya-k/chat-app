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
  @IsArray()
  @ArrayMinSize(1, {
    message: 'Minimal harus ada 1 orang yang ingini ditambahkan ke dalam room.',
  })
  @IsUUID('4', {
    each: true,
    message: 'Setiap user_id harus berupa UUID valid.',
  })
  members: string[]; // daftar user_id
}
