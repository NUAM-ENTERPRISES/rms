import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateChecklistItemDto {
  @ApiProperty()
  @IsBoolean()
  mandatory!: boolean;
}
