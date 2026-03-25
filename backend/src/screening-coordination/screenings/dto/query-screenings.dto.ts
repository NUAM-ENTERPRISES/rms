import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsInt, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { SCREENING_DECISION } from '../../../common/constants/statuses';

export class QueryScreeningsDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({
    description: 'Filter by candidate-project map ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  candidateProjectMapId?: string;

  @ApiProperty({
    description: 'Filter by coordinator ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  coordinatorId?: string;

  @ApiProperty({
    description: 'Filter by decision',
    enum: SCREENING_DECISION,
    required: false,
  })
  @IsOptional()
  @IsEnum(SCREENING_DECISION)
  decision?: string;

  @ApiProperty({
    description: 'Filter by project ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({
    description: 'Filter by RoleCatalog ID (filters candidate-projects by role catalog of the assigned role)',
    required: false,
  })
  @IsOptional()
  @IsString()
  roleCatalogId?: string;

  @ApiPropertyOptional({ description: 'Search by candidate name, email, mobile' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ description: 'Filter by trainer assignment flag (true/false). Omit to include all.' })
  @IsOptional()
  @IsBoolean()
  isAssignedTrainer?: boolean;

  @ApiPropertyOptional({ description: 'Filter by project status (subStatus name)' })
  @IsOptional()
  @IsString()
  status?: string;
}
