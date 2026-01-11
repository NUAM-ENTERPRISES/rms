import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryUpcomingInterviewsDto {
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

  @ApiPropertyOptional({ description: 'Search term: candidate name, candidate email, project title, role designation' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by candidate ID' })
  @IsOptional()
  @IsString()
  candidateId?: string;

  @ApiPropertyOptional({ description: 'Filter by recruiter / assignee ID' })
  @IsOptional()
  @IsString()
  recruiterId?: string;

  @ApiPropertyOptional({ description: 'Filter by role catalog ID' })
  @IsOptional()
  @IsString()
  roleCatalogId?: string;

  @ApiPropertyOptional({ description: 'Filter by role needed (id or designation text)' })
  @IsOptional()
  @IsString()
  roleNeeded?: string; 

  @ApiPropertyOptional({ description: 'Start date (inclusive) ISO format e.g. 2025-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (inclusive) ISO format e.g. 2025-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsString()
  endDate?: string;
}
