import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { BUNDLE_DOC_TYPES } from '../services/merged-pdf-classifier.service';

const REVIEWABLE_STATUSES = ['suggested', 'confirmed', 'rejected'] as const;

/** Reviewer corrections to one detected document inside a bundle. */
export class UpdateBundleSegmentDto {
  @ApiPropertyOptional({ description: '1-based first page.', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  startPage?: number;

  @ApiPropertyOptional({ description: '1-based last page.', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  endPage?: number;

  @ApiPropertyOptional({ enum: BUNDLE_DOC_TYPES })
  @IsOptional()
  @IsIn(BUNDLE_DOC_TYPES)
  docType?: string;

  @ApiPropertyOptional({ description: 'Display label, e.g. the issuer.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  docName?: string;

  @ApiPropertyOptional({ enum: REVIEWABLE_STATUSES })
  @IsOptional()
  @IsIn(REVIEWABLE_STATUSES)
  status?: (typeof REVIEWABLE_STATUSES)[number];

  @ApiPropertyOptional({
    description:
      'Corrected extracted fields: documentNumber, fullName, issuedAt, expiryDate, issuer.',
  })
  @IsOptional()
  @IsObject()
  extracted?: Record<string, string | null>;
}
