import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryInterviewsDto {
  @ApiProperty({
    description: 'Search term for candidate name or project title',
    required: false,
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'Filter by interview type',
    enum: ['technical', 'hr', 'managerial', 'final'],
    required: false,
  })
  @IsEnum(['technical', 'hr', 'managerial', 'final'])
  @IsOptional()
  type?: string;

  @ApiProperty({
    description: 'Filter by interview mode',
    enum: ['video', 'phone', 'in-person'],
    required: false,
  })
  @IsEnum(['video', 'phone', 'in-person'])
  @IsOptional()
  mode?: string;

  @ApiProperty({
    description: 'Filter by interview status',
    enum: [
      'pending',
      'scheduled',
      'completed',
      'complete',
      'cancelled',
      'rescheduled',
      'passed',
      'failed',
      'no-show',
    ],
    required: false,
  })
  @IsEnum([
    'pending',
    'scheduled',
    'completed',
    'complete',
    'cancelled',
    'rescheduled',
    'passed',
    'failed',
    'no-show',
  ])
  @IsOptional()
  status?: string;

  @ApiProperty({
    description: 'Filter by project ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiProperty({
    description: 'Filter by role catalog ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  roleCatalogId?: string;

  @ApiProperty({
    description: 'Filter by Project Role ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  roleNeededId?: string; 

  @ApiProperty({
    description: 'Filter by candidate ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  candidateId?: string;

  @ApiProperty({
    description: 'Page number (1-based)',
    example: 1,
    required: false,
  })
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    example: 10,
    required: false,
  })
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsOptional()
  limit?: number = 10;
}
