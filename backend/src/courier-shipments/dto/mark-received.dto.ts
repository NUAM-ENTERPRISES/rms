import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class MarkReceivedDto {
  @ApiProperty()
  @IsDateString()
  receivedAt!: string;

  @ApiPropertyOptional({
    description: 'Defaults to the authenticated user when omitted',
  })
  @IsOptional()
  @IsString()
  receivedByUserId?: string;

  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  receivedByName?: string;
}
