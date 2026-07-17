import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RecruiterCountrySectorScope } from '@prisma/client';

export enum CountryCoverageGroup {
  ALL = 'all',
  GCC = 'gcc',
}

export class QueryCountryCoverageDto {
  @ApiPropertyOptional({
    description: 'Country group filter',
    enum: CountryCoverageGroup,
    default: CountryCoverageGroup.ALL,
  })
  @IsOptional()
  @IsEnum(CountryCoverageGroup)
  group?: CountryCoverageGroup = CountryCoverageGroup.ALL;

  @ApiPropertyOptional({
    description: 'Search by country name or ISO code',
    example: 'Saudi',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter to a single country ISO code',
    example: 'SA',
  })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({
    description: 'Only count users whose coverage includes this sector',
    enum: RecruiterCountrySectorScope,
  })
  @IsOptional()
  @IsEnum(RecruiterCountrySectorScope)
  sector?: RecruiterCountrySectorScope;

  @ApiPropertyOptional({
    description: 'Page number',
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
    example: 15,
    default: 15,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 15;
}
