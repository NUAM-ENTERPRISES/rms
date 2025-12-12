import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsEmail,
} from 'class-validator';

export class UpdateInterviewDto {
  @ApiProperty({
    description: 'Scheduled interview time',
    example: '2024-01-15T10:00:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  scheduledTime?: string;

  @ApiProperty({
    description: 'Interview duration in minutes',
    example: 60,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  duration?: number;

  @ApiProperty({
    description: 'Interview type',
    example: 'technical',
    enum: ['technical', 'hr', 'managerial', 'final'],
    required: false,
  })
  @IsEnum(['technical', 'hr', 'managerial', 'final'])
  @IsOptional()
  type?: string;

  @ApiProperty({
    description: 'Interview mode',
    example: 'video',
    enum: ['video', 'phone', 'in-person'],
    required: false,
  })
  @IsEnum(['video', 'phone', 'in-person'])
  @IsOptional()
  mode?: string;

  @ApiProperty({ description: 'Meeting link for video interviews (optional; generated automatically for video mode if not provided)', required: false, example: 'https://meet.affiniks.com/abc123' })
  @IsOptional()
  @IsString()
  meetingLink?: string;

  @ApiProperty({
    description: 'Interview outcome',
    example: 'passed',
    enum: [
      'scheduled',
      'completed',
      'cancelled',
      'rescheduled',
      'passed',
      'failed',
      'no-show',
    ],
    required: false,
  })
  @IsEnum([
    'scheduled',
    'completed',
    'cancelled',
    'rescheduled',
    'passed',
    'failed',
    'no-show',
  ])
  @IsOptional()
  outcome?: string;

  @ApiProperty({
    description: 'Additional notes',
    example: 'Technical interview focusing on React and Node.js',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
