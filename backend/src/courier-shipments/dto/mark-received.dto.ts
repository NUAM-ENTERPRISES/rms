import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class MarkReceivedDocumentDto {
  @ApiProperty({ description: 'Document type key on the leg' })
  @IsString()
  docType!: string;

  @ApiProperty({
    description: 'Whether the document physically arrived in this shipment',
  })
  @IsBoolean()
  isReceived!: boolean;

  @ApiPropertyOptional({
    description:
      'Optional note when received; required when isReceived is false',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}

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

  @ApiProperty({
    type: [MarkReceivedDocumentDto],
    description:
      'Cross-check for every document on the leg with arrived/not-arrived status',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MarkReceivedDocumentDto)
  verifiedDocuments!: MarkReceivedDocumentDto[];
}
