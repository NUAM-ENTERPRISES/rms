import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum DatePeriod {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  THIS_WEEK = 'this_week',
  LAST_WEEK = 'last_week',
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  THIS_YEAR = 'this_year',
}

export class ProjectOverviewQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by Role Catalog ID' })
  @IsOptional()
  @IsString()
  roleCatalogId?: string;

  @ApiPropertyOptional({ description: 'Search by candidate name, email, or project title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by start date' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter by end date' })
  @IsOptional()
  @IsString()
  endDate?: string;
  @ApiPropertyOptional({ description: 'Filter by main status name' })
  @IsOptional()
  @IsString()
  mainStatus?: string;
  @ApiPropertyOptional({ 
    description: 'Filter by predefined date period',
    enum: DatePeriod 
  })
  @IsOptional()
  @IsEnum(DatePeriod)
  period?: DatePeriod;
}
