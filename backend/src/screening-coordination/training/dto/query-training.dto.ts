import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
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
}
