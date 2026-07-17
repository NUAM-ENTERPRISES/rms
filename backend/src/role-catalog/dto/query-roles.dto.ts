import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  Min,
  IsEnum,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ProfessionSector } from '@prisma/client';

export class QueryRolesDto {
  @ApiPropertyOptional({
    description: 'Search term for role name or description',
    example: 'nurse',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: 'Search term for role name (alias for q)',
    example: 'nurse',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by category',
    example: 'Clinical',
    enum: ['Clinical', 'Non-Clinical'],
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by profession type ID',
    example: 'pt_nurse_seed001',
  })
  @IsOptional()
  @IsString()
  professionTypeId?: string;

  @ApiPropertyOptional({
    description:
      'Filter roles by linked profession sector. Omit for all sectors.',
    enum: ProfessionSector,
    example: ProfessionSector.HEALTHCARE,
  })
  @IsOptional()
  @IsEnum(ProfessionSector)
  sector?: ProfessionSector;

  @ApiPropertyOptional({
    description: 'Filter by clinical roles only',
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
    description: 'Filter by active roles only. Omit to return both active and inactive.',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

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
    example: 'createdAt',
    enum: ['name', 'label', 'createdAt'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
