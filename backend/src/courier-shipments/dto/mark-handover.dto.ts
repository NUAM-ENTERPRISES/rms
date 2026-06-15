import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString } from 'class-validator';

export class MarkHandoverDto {
  @ApiProperty()
  @IsDateString()
  sentAt!: string;

  @ApiProperty()
  @IsString()
  sentByUserId!: string;

  @ApiProperty()
  @IsString()
  approvedByUserId!: string;
}
