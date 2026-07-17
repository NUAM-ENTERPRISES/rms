import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

function emptyToUndefined({ value }: { value: unknown }): unknown {
  if (value === '' || value === null) return undefined;
  return value;
}

/** @deprecated Prefer BulkResumeParseDto from bulk-resume-review.dto */
export class BulkCreateFromResumesDto {
  @ApiPropertyOptional({
    description:
      'Optional profession type. When omitted, the default active profession type is used.',
    example: 'pt_nurse_seed001',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  professionTypeId?: string;

  @ApiPropertyOptional({
    description: 'Candidate source (defaults to direct_application)',
    example: 'direct_application',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;

  @ApiPropertyOptional({
    description: 'Optional role catalog ID for attached resume documents',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  roleCatalogId?: string;
}

export type {
  BulkResumeCreatedItem,
  BulkResumeFailedItem,
  BulkCreateFromResumesResult,
} from './bulk-resume-review.dto';
