import { IsOptional, IsInt, Min, Max, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryAgentProjectsDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page (max 500)', default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Filter by project title or client name (case-insensitive partial match)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
