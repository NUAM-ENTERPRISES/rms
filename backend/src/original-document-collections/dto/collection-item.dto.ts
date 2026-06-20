import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CollectionItemDto {
  @ApiProperty({ example: 'degree_certificate_original' })
  @IsString()
  docType: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isReceived: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}
