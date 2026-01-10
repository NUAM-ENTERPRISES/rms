import {
  IsString,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadOfferLetterDto {
  @ApiProperty({
    description: 'Candidate ID',
    example: 'cand_123abc',
  })
  @IsString()
  candidateId: string;

  @ApiProperty({
    description: 'Project ID',
    example: 'proj_123abc',
  })
  @IsString()
  projectId: string;

  @ApiProperty({
    description: 'Role Catalog ID',
    example: 'rc_123abc',
  })
  @IsString()
  roleCatalogId: string;

  @ApiProperty({
    description: 'File name',
    example: 'offer_letter_john_doe.pdf',
  })
  @IsString()
  fileName: string;

  @ApiProperty({
    description: 'File URL (Digital Ocean Spaces)',
    example: 'https://spaces.example.com/documents/offer_letter_john_doe.pdf',
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
    description: 'Additional notes',
    example: 'Official offer letter for the project',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
