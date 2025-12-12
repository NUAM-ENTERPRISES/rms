import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsEmail,
} from 'class-validator';

export class CreateInterviewDto {
  @ApiProperty({
    description:
      'Candidate-project map ID (required to schedule an interview)',
    example: 'cmgr8ocw90009u5qojv0uqqg2',
  })
  @IsString()
  candidateProjectMapId: string;

  // Note: projectId has been removed. Scheduling now strictly requires
  // a valid `candidateProjectMapId` to ensure candidate-specific updates
  // and history entries.

  @ApiProperty({
    description: 'Scheduled interview time',
    example: '2024-01-15T10:00:00Z',
  })
  @IsDateString()
  scheduledTime: string;

  @ApiProperty({
    description: 'Interview duration in minutes',
    example: 60,
    default: 60,
  })
  @IsNumber()
  @IsOptional()
  duration?: number = 60;

  @ApiProperty({
    description: 'Interview type',
    example: 'technical',
    enum: ['technical', 'hr', 'managerial', 'final'],
    default: 'technical',
  })
  @IsEnum(['technical', 'hr', 'managerial', 'final'])
  @IsOptional()
  type?: string = 'technical';

  @ApiProperty({
    description: 'Interview mode',
    example: 'video',
    enum: ['video', 'phone', 'in-person'],
    default: 'video',
  })
  @IsEnum(['video', 'phone', 'in-person'])
  @IsOptional()
  mode?: string = 'video';

  @ApiPropertyOptional({ description: 'Meeting link (optional; generated automatically for video mode when not provided)', required: false, example: 'https://meet.affiniks.com/abc123' })
  @IsOptional()
  @IsString()
  meetingLink?: string;

  @ApiProperty({
    description: 'Additional notes',
    example: 'Technical interview focusing on React and Node.js',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
