import {
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { QueryCandidatesDto } from './query-candidates.dto';
import { Transform } from 'class-transformer';

export enum DateFilterType {
  ALL = 'all',
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  THIS_WEEK = 'this_week',
  LAST_WEEK = 'last_week',
  THIS_MONTH = 'this_month',
  THIS_YEAR = 'this_year',
  CUSTOM = 'custom',
}

export class QueryCandidateOverviewDto extends QueryCandidatesDto {
  @ApiPropertyOptional({
    description: 'Filter by recruiter ID (Admin only)',
  })
  @IsOptional()
  @IsString()
  recruiterId?: string;

  @ApiPropertyOptional({
    description: 'Date filter type',
    enum: DateFilterType,
  })
  @IsOptional()
  @IsEnum(DateFilterType)
  dateFilter?: DateFilterType;

  @ApiPropertyOptional({
    description: 'Filter by preferred countries (country codes)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : value?.split(',')))
  countryPreferences?: string[];

  @ApiPropertyOptional({
    description: 'Filter by sector types',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : value?.split(',')))
  sectorTypes?: string[];

  @ApiPropertyOptional({
    description: 'Filter by facility preferences',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : value?.split(',')))
  facilityPreferences?: string[];

  @ApiPropertyOptional({
    description: 'Filter by multiple sources',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : value?.split(',')))
  sources?: string[];

  @ApiPropertyOptional({
    description: 'Filter by project main status name',
  })
  @IsOptional()
  @IsString()
  mainStatus?: string;

  @ApiPropertyOptional({
    description: 'Filter by project sub-status name',
  })
  @IsOptional()
  @IsString()
  subStatus?: string;

  @ApiPropertyOptional({
    description: 'Filter by specific processing step key',
  })
  @IsOptional()
  @IsString()
  processingStep?: string;
}
