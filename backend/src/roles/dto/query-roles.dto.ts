import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryRolesDto {
  @ApiPropertyOptional({
    description: 'Search term for role name or description',
    example: 'manager',
  })
  @IsOptional()
  @IsString({ message: 'Search term must be a string' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by role type',
    example: 'CUSTOM',
    enum: ['ALL', 'SYSTEM', 'CUSTOM'],
  })
  @IsOptional()
  @IsIn(['ALL', 'SYSTEM', 'CUSTOM'], {
    message: 'Type must be ALL, SYSTEM, or CUSTOM',
  })
  type?: 'ALL' | 'SYSTEM' | 'CUSTOM' = 'ALL';

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number = 10;
}
