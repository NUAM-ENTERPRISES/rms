import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { BulkResumeReviewDraftDto } from './bulk-resume-review.dto';

const CANDIDATE_SOURCES = [
  'manual',
  'meta',
  'direct_enquiry',
  'referral',
  'paid_ads',
  'agent',
  'hospital_visit',
  'expo_event',
  'job_board',
  'social_media',
  'direct_application',
  'internal',
] as const;

export class BulkResumeCreateDto {
  @ApiPropertyOptional({
    enum: CANDIDATE_SOURCES,
    default: 'manual',
  })
  @IsOptional()
  @IsEnum(CANDIDATE_SOURCES)
  source?: (typeof CANDIDATE_SOURCES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  professionTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleCatalogId?: string;

  @ApiProperty({
    type: () => [BulkResumeReviewDraftDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkResumeReviewDraftDto)
  drafts!: BulkResumeReviewDraftDto[];
}
