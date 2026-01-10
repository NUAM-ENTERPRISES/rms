import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryAllProcessingCandidatesDto {
  @ApiProperty({
    description: 'Search term for candidate name, email, or project title',
    required: false,
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'Filter by project ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiProperty({
    description: 'Filter by Role Catalog ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  roleCatalogId?: string;

  @ApiProperty({
    description: 'Filter by processing status',
    enum: ['assigned', 'in_progress', 'completed', 'cancelled'],
    default: 'assigned',
    required: false,
  })
  @IsString()
  @IsOptional()
  status?: string = 'assigned';

  @ApiProperty({
    description: 'Page number for pagination',
    default: 1,
    required: false,
  })
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    default: 10,
    required: false,
  })
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @IsOptional()
  limit?: number = 10;
}
