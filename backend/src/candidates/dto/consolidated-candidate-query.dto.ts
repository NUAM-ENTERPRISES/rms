import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ConsolidatedCandidateQueryDto {
  @ApiPropertyOptional({
    description: 'Project ID to check nominations against',
    example: 'project_123',
  })
  @IsString()
  projectId: string;

  @ApiPropertyOptional({
    description: 'Search term for candidate name, contact, or email',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by Role Catalog ID',
    example: 'role_123',
  })
  @IsOptional()
  @IsString()
  roleCatalogId?: string;

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
}
