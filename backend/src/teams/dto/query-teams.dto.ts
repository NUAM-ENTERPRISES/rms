import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum TeamSortBy {
  NAME = 'name',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryTeamsDto {
  @ApiPropertyOptional({
    description: 'Search term for team name',
    example: 'healthcare',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by team lead ID',
    example: 'user123',
  })
  @IsOptional()
  @IsString()
  leadId?: string;

  @ApiPropertyOptional({
    description: 'Filter by team head ID',
    example: 'user456',
  })
  @IsOptional()
  @IsString()
  headId?: string;

  @ApiPropertyOptional({
    description: 'Filter by team manager ID',
    example: 'user789',
  })
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by user ID (teams that include this user)',
    example: 'user123',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: TeamSortBy,
    example: TeamSortBy.NAME,
  })
  @IsOptional()
  @IsEnum(TeamSortBy)
  sortBy?: TeamSortBy = TeamSortBy.NAME;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    example: SortOrder.ASC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.ASC;
}
