import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

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

export class BulkResumeParseDto {
  @ApiPropertyOptional({
    description: 'Candidate source used for all drafts in this parse batch',
    enum: CANDIDATE_SOURCES,
    default: 'manual',
  })
  @IsOptional()
  @IsEnum(CANDIDATE_SOURCES)
  source?: (typeof CANDIDATE_SOURCES)[number];

  @ApiPropertyOptional({
    description: 'Optional profession type id to apply during candidate create',
  })
  @IsOptional()
  @IsString()
  professionTypeId?: string;

  @ApiPropertyOptional({
    description: 'Optional role catalog id to tag uploaded resume documents',
  })
  @IsOptional()
  @IsString()
  roleCatalogId?: string;
}
