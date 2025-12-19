import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class SendToScreeningDto {
  @ApiProperty({
    description:
      'ID of the Interview Coordinator to conduct the screening',
    example: 'ckx7r9012ijkl',
  })
  @IsString()
  @IsNotEmpty()
  coordinatorId: string;

  @ApiProperty({
    description:
      'Scheduled date and time for the screening (ISO 8601 format)',
    example: '2025-01-15T10:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  scheduledTime?: string;

  @ApiProperty({
    description:
      'Meeting link for the screening (e.g., Zoom, Google Meet)',
    example: 'https://meet.google.com/abc-xyz',
    required: false,
  })
  @IsOptional()
  @IsString()
  meetingLink?: string;
}
