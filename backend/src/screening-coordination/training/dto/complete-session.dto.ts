import { IsEnum, IsOptional, IsString, MaxLength, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TRAINING_PERFORMANCE } from '../../../common/constants/statuses';

export class CompleteTrainingSessionDto {
  @ApiPropertyOptional({
    description: 'Performance rating for the session (numeric score 0-100)',
    example: 85,
  })
  @IsOptional()
  performanceRating?: string | number;

  @ApiPropertyOptional({
    description: 'Session notes and observations',
    maxLength: 2000,
    example:
      'Candidate showed significant improvement in communication skills...',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Notes cannot exceed 2000 characters' })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Feedback for the candidate',
    maxLength: 2000,
    example: 'Great progress! Continue practicing presentation skills...',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Feedback cannot exceed 2000 characters' })
  feedback?: string;

  @ApiPropertyOptional({
    description: 'Session notes for recruiter reference',
    example: 'Participant was very active and responsive.',
  })
  @IsOptional()
  @IsString()
  sessionNotes?: string;

  @ApiPropertyOptional({
    description: 'Internal comments for recruiters',
    example: 'Candidate needs more focus on technical aspects.',
  })
  @IsOptional()
  @IsString()
  internalComments?: string;

  @ApiPropertyOptional({
    description: 'Topics covered in this session',
    type: [String],
    example: ['Technical Skills', 'Soft Skills'],
  })
  @IsOptional()
  @IsArray()
  topicsCovered?: string[];
}
