import {
  IsBoolean,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
  ArrayMinSize,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RoomMemberDto {
  @IsUUID('4')
  userId: string;

  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean = false;
}

export class RoomSettingsDto {
  @IsOptional()
  @IsBoolean()
  allowInvites?: boolean = true;

  @IsOptional()
  @IsBoolean()
  muteNotifications?: boolean = false;

  @IsOptional()
  @IsEnum(['public', 'private'])
  visibility?: 'public' | 'private' = 'private';
}

export class CreateRoomNestedDto {
  @IsOptional()
  @IsString()
  groupName?: string;

  @IsBoolean()
  @IsOptional()
  isGroup?: boolean = false;

  @IsArray()
  @ArrayMinSize(1, { message: 'Minimal harus ada 1 anggota dalam room.' })
  @ValidateNested({ each: true })
  @Type(() => RoomMemberDto)
  members: RoomMemberDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => RoomSettingsDto)
  settings?: RoomSettingsDto;
}
