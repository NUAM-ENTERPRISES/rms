import {
  IsString,
  IsInt,
  IsObject,
  IsArray,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AllocationStatusDto {
  @ApiProperty({
    description: 'Role needed ID',
    example: 'role_123abc',
  })
  @IsString()
  roleNeededId: string;

  @ApiProperty({
    description: 'Role designation',
    example: 'Registered Nurse',
  })
  @IsString()
  designation: string;

  @ApiProperty({
    description: 'Required quantity for this role',
    example: 10,
  })
  @IsInt()
  quantity: number;

  @ApiProperty({
    description: 'Number of active nominations',
    example: 5,
  })
  @IsInt()
  activeNominations: number;

  @ApiProperty({
    description: 'Number of selected candidates',
    example: 2,
  })
  @IsInt()
  selected: number;

  @ApiProperty({
    description: 'Number of candidates in processing',
    example: 1,
  })
  @IsInt()
  processing: number;

  @ApiProperty({
    description: 'Number of hired candidates',
    example: 0,
  })
  @IsInt()
  hired: number;

  @ApiProperty({
    description: 'Total allocated candidates',
    example: 8,
  })
  @IsInt()
  totalAllocated: number;

  @ApiProperty({
    description: 'Number of duplicate blocks (candidates already allocated)',
    example: 0,
  })
  @IsInt()
  duplicateBlocks: number;
}

export class AllocationResultDto {
  @ApiProperty({
    description: 'Number of candidates considered',
    example: 50,
  })
  @IsInt()
  considered: number;

  @ApiProperty({
    description: 'Number of candidates successfully assigned',
    example: 45,
  })
  @IsInt()
  assigned: number;

  @ApiProperty({
    description: 'Number of candidates skipped due to duplicates',
    example: 3,
  })
  @IsInt()
  skippedDuplicates: number;

  @ApiProperty({
    description: 'List of errors encountered',
    example: ['Failed to allocate candidate xyz: Database error'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  errors: string[];
}

export class RecruiterWorkloadDto {
  @ApiProperty({
    description: 'Recruiter information',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  recruiter: {
    id: string;
    name: string;
    email: string;
    workload: number;
  };

  @ApiProperty({
    description: 'Total number of allocations',
    example: 25,
  })
  @IsInt()
  totalAllocations: number;

  @ApiProperty({
    description: 'Status counts for allocations',
    type: 'object',
    additionalProperties: true,
    example: {
      nominated: 10,
      selected: 5,
      processing: 3,
      hired: 2,
    },
  })
  @IsObject()
  statusCounts: Record<string, number>;

  @ApiProperty({
    description: 'Recent allocations',
    type: 'array',
  })
  @IsArray()
  recentAllocations: any[];
}
