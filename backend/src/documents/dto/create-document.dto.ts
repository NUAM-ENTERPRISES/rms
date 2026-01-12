import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DOCUMENT_TYPE } from '../../common/constants';

export class CreateDocumentDto {
  @ApiProperty({
    description: 'Candidate ID',
    example: 'cand_123abc',
  })
  @IsString()
  candidateId: string;

  @ApiProperty({
    description: 'Document type',
    enum: Object.values(DOCUMENT_TYPE),
    example: 'passport',
  })
  @IsEnum(Object.values(DOCUMENT_TYPE))
  docType: string;

  @ApiProperty({
    description: 'File name',
    example: 'passport_john_doe.pdf',
  })
  @IsString()
  fileName: string;

  @ApiProperty({
    description: 'File URL (Digital Ocean Spaces)',
    example: 'https://spaces.example.com/documents/passport_john_doe.pdf',
  })
  @IsString()
  fileUrl: string;

  @ApiPropertyOptional({
    description: 'File size in bytes',
    example: 1024000,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;

  @ApiPropertyOptional({
    description: 'MIME type',
    example: 'application/pdf',
  })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({
    description: 'Expiry date for documents with expiration',
    example: '2025-12-31T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({
    description: 'Document number (e.g., passport number)',
    example: 'A12345678',
  })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Scanned copy of original document',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Role Catalog ID (only for resume)',
    example: 'rc_123abc',
  })
  @IsOptional()
  @IsString()
  roleCatalogId?: string;

  @ApiPropertyOptional({
    description: 'Processing Step ID to attach this document to',
    example: 'step_123abc',
  })
  @IsOptional()
  @IsString()
  processingStepId?: string;
}
