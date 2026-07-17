import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RecruiterCountrySectorScope } from '@prisma/client';

export class QueryCountryCoverageUsersDto {
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
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Search by user name or email',
    example: 'jane',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter users whose coverage includes this sector',
    enum: RecruiterCountrySectorScope,
  })
  @IsOptional()
  @IsEnum(RecruiterCountrySectorScope)
  sector?: RecruiterCountrySectorScope;

  @ApiPropertyOptional({
    description:
      'When listing GCC users, filter to users who cover this specific GCC country code',
    example: 'QA',
  })
  @IsOptional()
  @IsString()
  coveredCountry?: string;
}
