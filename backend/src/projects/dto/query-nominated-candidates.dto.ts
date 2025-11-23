import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryNominatedCandidatesDto {
  @ApiPropertyOptional({
    description: 'Search term for candidate name, email, or mobile',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      'Filter by MAIN or SUB status ID (cuid). If you pass a sub-status id it will match subStatusId; otherwise statusId will match either mainStatusId or subStatusId. Prefer using `status` (string name) so your clients are resilient to changing seed IDs.',
    example: 'clx9gfdt12345mainstatus',
  })
  @IsOptional()
  @IsString()
  statusId?: string;   // 🔥 FIXED

  @ApiPropertyOptional({
    description:
      'Filter by MAIN or SUB status NAME. This is preferred over IDs because seed IDs can change — the service will match this string against both mainStatus.name and subStatus.name.',
    example: 'nominated_initial',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description:
      'Filter by SUB status ID (cuid). Prefer `subStatus` (name) for stable filtering across environments.',
    example: 'clx9gfdt12345substatus',
  })
  @IsOptional()
  @IsString()
  subStatusId?: string;   // 🔥 NEW FIELD

  @ApiPropertyOptional({
    description:
      'Filter specifically by SUB status NAME. This is preferred over subStatusId (cuid) because seed IDs can change across environments.',
    example: 'documents_verified',
  })
  @IsOptional()
  @IsString()
  subStatus?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'matchScore',
    default: 'matchScore',
    enum: ['matchScore', 'createdAt', 'firstName', 'experience'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'matchScore';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    default: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
