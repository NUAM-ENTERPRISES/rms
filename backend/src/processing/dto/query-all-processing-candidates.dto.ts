import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryAllProcessingCandidatesDto {
  @ApiProperty({
    description: 'Search term for candidate name, email, or project title',
    required: false,
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'Filter by project ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiProperty({
    description: 'Filter by Role Catalog ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  roleCatalogId?: string;

  @ApiProperty({
    description: 'Filter by processing status',
    enum: ['assigned', 'in_progress', 'completed', 'cancelled', 'on_hold', 'all', 'visa_stamped'],
    required: false,
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({
    description: 'Filter by current processing step key (e.g., offer_letter, hrd, visa, completed)',
    required: false,
  })
  @IsString()
  @IsOptional()
  step?: string;

  @ApiPropertyOptional({
    description: "Optional admin-only filter: 'visa_stamped', 'total_processing', or 'awaiting_requests'",
    enum: ['visa_stamped', 'total_processing', 'awaiting_requests'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['visa_stamped', 'total_processing', 'awaiting_requests'])
  filterType?: 'visa_stamped' | 'total_processing' | 'awaiting_requests';

  @ApiProperty({
    description: 'Page number for pagination',
    default: 1,
    required: false,
  })
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    default: 10,
    required: false,
  })
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by recruiter user ID' })
  @IsString()
  @IsOptional()
  recruiterId?: string;

  @ApiPropertyOptional({ description: 'Filter by assigned processing team user ID (admin)' })
  @IsString()
  @IsOptional()
  assignedToId?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated project country codes (ISO-2)',
  })
  @IsString()
  @IsOptional()
  countryCodes?: string;

  @ApiPropertyOptional({ description: 'Filter by project sector' })
  @IsString()
  @IsOptional()
  sector?: string;

  @ApiPropertyOptional({ description: 'Filter by locker/file number (partial match)' })
  @IsString()
  @IsOptional()
  fileNumber?: string;

  @ApiPropertyOptional({ description: 'Filter processing records updated on/after (ISO date)' })
  @IsString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter processing records updated on/before (ISO date)' })
  @IsString()
  @IsOptional()
  dateTo?: string;
}
