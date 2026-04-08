import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TRAINING_STATUS } from '../../../common/constants/statuses';

export class QueryTrainingAssignmentsDto {
  @ApiProperty({
    description: 'Filter by candidate-project map ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  candidateProjectMapId?: string;

  @ApiProperty({
    description: 'Filter by assigned by user ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  assignedBy?: string;

  @ApiProperty({
    description: 'Filter by status',
    enum: TRAINING_STATUS,
    required: false,
  })
  @IsOptional()
  @IsEnum(TRAINING_STATUS)
  status?: string;

  @ApiProperty({ description: 'Page number (1-based)', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
