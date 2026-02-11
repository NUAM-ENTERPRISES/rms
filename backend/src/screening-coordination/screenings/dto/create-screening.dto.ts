import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsInt,
  IsEnum,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import {
  SCREENING_MODE,
  SCREENING_CATEGORY,
} from '../../../common/constants/statuses';

export class ChecklistItemDto {
  @ApiProperty({
    description: 'Category of the checklist item',
    enum: SCREENING_CATEGORY,
    example: 'technical_skills',
  })
  @IsEnum(SCREENING_CATEGORY)
  category: string;

  @ApiProperty({
    description: 'Criterion being evaluated',
    example: 'Medication Administration Knowledge',
  })
  @IsString()
  criterion: string;

  @ApiProperty({
    description: 'Template item ID if this answer came from a template',
    required: false,
  })
  @IsOptional()
  @IsString()
  templateItemId?: string;

  @ApiProperty({
    description: 'Whether the criterion passed',
    example: true,
  })
  @IsBoolean()
  passed: boolean;

  @ApiProperty({
    description: 'Notes for this criterion',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Numeric score for this checklist item (e.g. percentage or points)',
    example: 86.5,
  })
  @IsNumber()
  score: number;
}

export class CreateScreeningDto {
  @ApiProperty({
    description: 'Template ID to use for this interview',
    example: 'ckx7r1234abcd',
    required: false,
  })
  @IsOptional()
  @IsString()
  templateId?: string;
  @ApiProperty({
    description: 'Candidate-Project map ID',
    example: 'ckx7r1234abcd',
  })
  @IsString()
  candidateProjectMapId: string;

  @ApiProperty({
    description: 'Interview Coordinator ID',
    example: 'ckx7r5678efgh',
  })
  @IsString()
  coordinatorId: string;

  @ApiProperty({
    description: 'Scheduled interview time',
    example: '2025-01-30T10:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  scheduledTime?: string;

  @ApiProperty({
    description: 'Interview duration in minutes',
    example: 60,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(240)
  duration?: number;

  @ApiProperty({
    description: 'Meeting link',
    example: 'https://meet.google.com/abc-defg-hij',
    required: false,
  })
  @IsOptional()
  @IsString()
  meetingLink?: string;

  @ApiProperty({
    description: 'Interview mode',
    enum: SCREENING_MODE,
    example: 'video',
    required: false,
  })
  @IsOptional()
  @IsEnum(SCREENING_MODE)
  mode?: string;

  @ApiProperty({
    description: 'Whether a trainer/coach has been assigned to this screening',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isAssignedTrainer?: boolean;
}
