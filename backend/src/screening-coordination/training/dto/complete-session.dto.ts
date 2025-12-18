import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TRAINING_PERFORMANCE } from '../../../common/constants/statuses';

export class CompleteTrainingSessionDto {
  @ApiProperty({
    description: 'Performance rating for the session',
    enum: Object.values(TRAINING_PERFORMANCE),
    example: TRAINING_PERFORMANCE.GOOD,
  })
  @IsEnum(TRAINING_PERFORMANCE, {
    message: 'Performance rating must be a valid value',
  })
  performanceRating: string;

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
}
