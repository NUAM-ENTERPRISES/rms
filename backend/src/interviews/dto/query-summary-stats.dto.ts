import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class QuerySummaryStatsDto {
  @ApiPropertyOptional({ description: 'Filter counts by project ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter counts by role catalog ID' })
  @IsOptional()
  @IsString()
  roleCatalogId?: string;
}
