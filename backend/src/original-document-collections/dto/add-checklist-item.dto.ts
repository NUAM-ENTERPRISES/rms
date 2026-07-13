import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { ORIGINAL_DOCUMENT_TYPES } from '../constants/collection-types';

export class AddChecklistItemDto {
  @ApiProperty({
    enum: ORIGINAL_DOCUMENT_TYPES,
    example: 'offer_letter_original',
  })
  @IsString()
  @IsIn(ORIGINAL_DOCUMENT_TYPES)
  docType!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  mandatory?: boolean;
}
