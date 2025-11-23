import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryCandidateProjectStatusDto {
  @ApiPropertyOptional({ description: 'Search term for main or sub status name, label, or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by main stage name (e.g., "documents", "interview")' })
  @IsOptional()
  @IsString()
  stage?: string;

  @ApiPropertyOptional({
    description:
      'Filter by terminal status. NOTE: your current schema does not include an "isTerminal" boolean on sub-statuses. Use "true" to use heuristic (rejected|hired|withdrawn) behaviour or add an isTerminal boolean to sub-status table.',
  })
  @IsOptional()
  @IsString()
  isTerminal?: string;

  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 25, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 25;
}
