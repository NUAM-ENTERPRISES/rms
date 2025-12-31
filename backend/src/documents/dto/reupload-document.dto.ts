import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReuploadDocumentDto {
  @ApiProperty({
    description: 'Candidate Project Map ID',
    example: 'cpm_123abc',
  })
  @IsString()
  candidateProjectMapId: string;

  @ApiProperty({
    description: 'File name',
    example: 'passport_john_doe_v2.pdf',
  })
  @IsString()
  fileName: string;

  @ApiProperty({
    description: 'File URL (Digital Ocean Spaces)',
    example: 'https://spaces.example.com/documents/passport_john_doe_v2.pdf',
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
    example: 'Re-uploaded copy with better quality',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
