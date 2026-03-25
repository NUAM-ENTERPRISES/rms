import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SCREENING_DECISION } from '../../../common/constants/statuses';
import { ChecklistItemDto } from './create-screening.dto';

export class CompleteScreeningDto {
  @ApiProperty({
    description: 'Overall score (percentage out of 100)',
    example: 86,
    minimum: 0,
    maximum: 100,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  overallRating: number;
  @ApiProperty({
    description: 'Interview decision',
    enum: SCREENING_DECISION,
    example: 'approved',
  })
  @IsEnum(SCREENING_DECISION)
  decision: string;

  @ApiProperty({
    description: 'General remarks about the interview',
    required: false,
  })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiProperty({
    description: "Candidate's strengths",
    required: false,
  })
  @IsOptional()
  @IsString()
  strengths?: string;

  @ApiProperty({
    description: 'Areas that need improvement',
    required: false,
  })
  @IsOptional()
  @IsString()
  areasOfImprovement?: string;

  @ApiProperty({
    description: 'Candidate appearance score (1-5)',
    example: 4,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  goodLooking?: number;

  @ApiProperty({
    description: 'Impression of fairness score (1-5)',
    example: 4,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  fairness?: number;

  @ApiProperty({
    description: 'Language proficiency description',
    example: 'fluent',
    required: false,
  })
  @IsOptional()
  @IsString()
  languageProficiency?: string;

  @ApiProperty({
    description: 'Checklist items evaluation',
    type: [ChecklistItemDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklistItems?: ChecklistItemDto[];

  @ApiProperty({
    description: 'Training type (optional for needs_training)',
    required: false,
  })
  @IsOptional()
  @IsString()
  trainingType?: string;

  @ApiProperty({
    description: 'Focus areas for training',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  focusAreas?: string[];

  @ApiProperty({
    description: 'Training priority',
    required: false,
  })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiProperty({
    description: 'Target completion date for training',
    required: false,
  })
  @IsOptional()
  @IsString()
  targetCompletionDate?: string;

  @ApiProperty({
    description: 'Training notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  trainingNotes?: string;
}
