import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class GetRoomMessagesQueryDto {
  @IsOptional()
  @IsString()
  beforeAt?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number = 20;
}
