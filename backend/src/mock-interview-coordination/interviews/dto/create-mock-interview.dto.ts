import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
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
  MOCK_INTERVIEW_MODE,
  MOCK_INTERVIEW_CATEGORY,
} from '../../../common/constants/statuses';

export class ChecklistItemDto {
  @ApiProperty({
    description: 'Category of the checklist item',
    enum: MOCK_INTERVIEW_CATEGORY,
    example: 'technical_skills',
  })
  @IsEnum(MOCK_INTERVIEW_CATEGORY)
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
  passed: boolean;

  @ApiProperty({
    description: 'Rating (1-5 scale)',
    example: 4,
    required: false,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiProperty({
    description: 'Notes for this criterion',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateMockInterviewDto {
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
    enum: MOCK_INTERVIEW_MODE,
    example: 'video',
    required: false,
  })
  @IsOptional()
  @IsEnum(MOCK_INTERVIEW_MODE)
  mode?: string;

}
