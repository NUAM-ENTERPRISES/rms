import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryProjectPickerDto {
  @ApiPropertyOptional({
    description: 'Filter by project status (default: IN_PROGRESS)',
    enum: ['IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'],
  })
  @IsOptional()
  @Transform(({ value }) => value?.toUpperCase?.())
  @IsEnum(['IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Search project title (case-insensitive partial match)',
    example: 'emergency',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

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
  limit?: number;
}
