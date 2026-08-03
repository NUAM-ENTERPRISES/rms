import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryProfessionTypesDto {
  @ApiPropertyOptional({
    description: 'Filter by sector',
    enum: ['HEALTHCARE', 'NON_HEALTH_CARE'],
  })
  @IsOptional()
  @IsEnum(['HEALTHCARE', 'NON_HEALTH_CARE'])
  sector?: 'HEALTHCARE' | 'NON_HEALTH_CARE';

  @ApiPropertyOptional({
    description: 'Page number (omit with limit to return all active types)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page (omit with page to return all active types)',
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
