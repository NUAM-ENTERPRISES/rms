import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsInt,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export class CreateTrainingSessionDto {
  @ApiProperty({
    description: 'Training Assignment ID',
    example: 'ckx7r1234abcd',
  })
  @IsString()
  trainingAssignmentId: string;

  @ApiProperty({
    description: 'Session date and time',
    example: '2025-01-30T14:00:00Z',
  })
  @IsDateString()
  sessionDate: string;

  @ApiPropertyOptional({
    description: 'Session type',
    enum: ['video', 'phone', 'in_person'],
    default: 'video',
  })
  @IsOptional()
  @IsEnum(['video', 'phone', 'in_person'])
  sessionType?: string;

  @ApiProperty({
    description: 'Session duration in minutes',
    example: 60,
    default: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  duration?: number;

  @ApiPropertyOptional({
    description: 'Topics covered in the session',
    type: [String],
    example: ['Communication', 'Presentation Skills'],
  })
  @IsOptional()
  @IsArray()
  topicsCovered?: string[];

  @ApiPropertyOptional({
    description: 'Planned activities for the session',
    example: 'Screening presentation followed by feedback session',
  })
  @IsOptional()
  @IsString()
  plannedActivities?: string;

  @ApiPropertyOptional({
    description: 'Trainer name or ID',
  })
  @IsOptional()
  @IsString()
  trainer?: string;
}
