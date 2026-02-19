import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsInt, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class QueryRolesDto {
  @ApiPropertyOptional({
    description: 'Search term for role name or description',
    example: 'nurse',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: 'Filter by category',
    example: 'Clinical',
    enum: ['Clinical', 'Non-Clinical'],
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({    description: 'Filter by role type',
    example: 'nurse',
    enum: ['nurse', 'doctor', 'other'],
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({    description: 'Filter by clinical roles only',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isClinical?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by role department ID',
    example: 'rd_123',
  })
  @IsOptional()
  @IsString()
  roleDepartmentId?: string;

  @ApiPropertyOptional({
    description: 'Filter by active roles only',
    example: true,
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'name',
    enum: ['name', 'label', 'createdAt'],
    default: 'name',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'name';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'asc',
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc';
}
