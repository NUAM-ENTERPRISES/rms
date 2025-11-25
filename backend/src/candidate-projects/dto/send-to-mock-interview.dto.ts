import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class SendToMockInterviewDto {
  @ApiProperty({
    description:
      'ID of the Interview Coordinator to conduct the mock interview',
    example: 'ckx7r9012ijkl',
  })
  @IsString()
  @IsNotEmpty()
  coordinatorId: string;

  @ApiProperty({
    description:
      'Scheduled date and time for the mock interview (ISO 8601 format)',
    example: '2025-01-15T10:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  scheduledTime?: string;

  @ApiProperty({
    description:
      'Meeting link for the mock interview (e.g., Zoom, Google Meet)',
    example: 'https://meet.google.com/abc-xyz',
    required: false,
  })
  @IsOptional()
  @IsString()
  meetingLink?: string;
}
