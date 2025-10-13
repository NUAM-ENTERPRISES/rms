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

export enum QualificationLevel {
  CERTIFICATE = 'CERTIFICATE',
  DIPLOMA = 'DIPLOMA',
  BACHELOR = 'BACHELOR',
  MASTER = 'MASTER',
  DOCTORATE = 'DOCTORATE',
}

export class QueryQualificationsDto {
  @ApiPropertyOptional({
    description:
      'Search term for qualification name, shortName, or description',
    example: 'nursing',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: 'Filter by qualification level',
    example: 'BACHELOR',
    enum: QualificationLevel,
  })
  @IsOptional()
  @IsEnum(QualificationLevel)
  level?: QualificationLevel;

  @ApiPropertyOptional({
    description: 'Filter by field of study',
    example: 'Nursing',
  })
  @IsOptional()
  @IsString()
  field?: string;

  @ApiPropertyOptional({
    description: 'Filter by country code for localized qualifications',
    example: 'IN',
  })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({
    description: 'Filter by active qualifications only',
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
    enum: ['name', 'level', 'field', 'createdAt'],
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
