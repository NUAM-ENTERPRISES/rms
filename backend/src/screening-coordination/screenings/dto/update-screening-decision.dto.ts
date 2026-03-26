import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsArray, IsDateString } from 'class-validator';
import {
  SCREENING_DECISION,
  TRAINING_TYPE,
  TRAINING_PRIORITY,
} from '../../../common/constants/statuses';

export class UpdateScreeningDecisionDto {
  @ApiProperty({
    description: 'New decision for the screening',
    enum: SCREENING_DECISION,
    example: SCREENING_DECISION.APPROVED,
  })
  @IsEnum(SCREENING_DECISION)
  decision: string;

  @ApiProperty({
    description: 'Optional remark or reason for decision update',
    required: false,
  })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiProperty({
    description: 'Training type when decision is needs_training',
    enum: TRAINING_TYPE,
    example: TRAINING_TYPE.TECHNICAL,
    required: false,
  })
  @IsOptional()
  @IsEnum(TRAINING_TYPE)
  trainingType?: string;

  @ApiProperty({
    description: 'Focus areas for training when decision is needs_training',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  focusAreas?: string[];

  @ApiProperty({
    description: 'Training priority when decision is needs_training',
    enum: TRAINING_PRIORITY,
    example: TRAINING_PRIORITY.MEDIUM,
    required: false,
  })
  @IsOptional()
  @IsEnum(TRAINING_PRIORITY)
  priority?: string;

  @ApiProperty({
    description: 'Target completion date when decision is needs_training',
    required: false,
    example: '2025-03-30',
  })
  @IsOptional()
  @IsDateString()
  targetCompletionDate?: string;

  @ApiProperty({
    description: 'Additional training notes when decision is needs_training',
    required: false,
  })
  @IsOptional()
  @IsString()
  trainingNotes?: string;
}
