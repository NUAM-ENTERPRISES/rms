import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsArray,
} from 'class-validator';
import {
  TRAINING_TYPE,
  TRAINING_PRIORITY,
} from '../../../common/constants/statuses';

export class CreateTrainingAssignmentDto {
  @ApiProperty({
    description: 'Candidate-Project map ID',
    example: 'ckx7r1234abcd',
  })
  @IsString()
  candidateProjectMapId: string;

  @ApiProperty({
    description: 'Mock Interview ID that triggered this training',
    example: 'ckx7r5678efgh',
    required: false,
  })
  @IsOptional()
  @IsString()
  mockInterviewId?: string;

  @ApiProperty({
    description: 'User ID who assigned the training (Interview Coordinator)',
    example: 'ckx7r9012ijkl',
  })
  @IsString()
  assignedBy: string;

  @ApiProperty({
    description: 'Type of training',
    enum: TRAINING_TYPE,
    example: 'interview_skills',
  })
  @IsEnum(TRAINING_TYPE)
  trainingType: string;

  @ApiProperty({
    description: 'Areas that need improvement',
    type: [String],
    example: ['Communication skills', 'Technical knowledge'],
  })
  @IsArray()
  @IsString({ each: true })
  focusAreas: string[];

  @ApiProperty({
    description: 'Training priority',
    enum: TRAINING_PRIORITY,
    example: 'high',
    required: false,
  })
  @IsOptional()
  @IsEnum(TRAINING_PRIORITY)
  priority?: string;

  @ApiProperty({
    description: 'Target completion date',
    example: '2025-02-15T00:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  targetCompletionDate?: string;

  @ApiProperty({
    description: 'Additional notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
