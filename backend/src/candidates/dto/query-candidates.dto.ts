import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryCandidatesDto {
  @ApiPropertyOptional({
    description: 'Search term for candidate name, contact, or email',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by candidate status',
    enum: ['new', 'shortlisted', 'selected', 'rejected', 'hired'],
  })
  @IsOptional()
  @IsEnum(['new', 'shortlisted', 'selected', 'rejected', 'hired'])
  currentStatus?: string;

  @ApiPropertyOptional({
    description: 'Filter by source',
    enum: ['manual', 'meta', 'referral'],
  })
  @IsOptional()
  @IsEnum(['manual', 'meta', 'referral'])
  source?: string;

  @ApiPropertyOptional({
    description: 'Filter by team ID',
    example: 'team123',
  })
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional({
    description: 'Filter by assigned recruiter ID',
    example: 'user123',
  })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by minimum experience',
    example: 2,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minExperience?: number;

  @ApiPropertyOptional({
    description: 'Filter by maximum experience',
    example: 10,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxExperience?: number;

  @ApiPropertyOptional({
    description: 'Filter by minimum expected salary',
    example: 30000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minSalary?: number;

  @ApiPropertyOptional({
    description: 'Filter by maximum expected salary',
    example: 80000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxSalary?: number;

  @ApiPropertyOptional({
    description: 'Filter by date of birth (from date)',
    example: '1980-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirthFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by date of birth (to date)',
    example: '2000-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirthTo?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: [
      'createdAt',
      'updatedAt',
      'name',
      'currentStatus',
      'experience',
      'expectedSalary',
    ],
    example: 'createdAt',
  })
  @IsOptional()
  @IsEnum([
    'createdAt',
    'updatedAt',
    'name',
    'currentStatus',
    'experience',
    'expectedSalary',
  ])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: string = 'desc';
}
