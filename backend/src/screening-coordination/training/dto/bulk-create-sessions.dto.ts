import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export class BulkCreateSessionsDto {
  @ApiProperty({
    description: 'Array of Training Assignment IDs',
    example: ['ckx7r1234abcd', 'ckx7r5678efgh'],
  })
  @IsArray()
  @IsString({ each: true })
  trainingAssignmentIds: string[];

  @ApiProperty({
    description: 'Scheduled date and time for the sessions',
    example: '2025-01-20T10:00:00Z',
  })
  @IsDateString()
  sessionDate: string;

  @ApiPropertyOptional({
    description: 'Duration in minutes',
    example: 60,
    default: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  duration?: number;

  @ApiPropertyOptional({
    description: 'Topic or agenda for the session',
    example: 'Deep dive into specialized role requirements',
  })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiPropertyOptional({
    description: 'Meeting link (for video sessions)',
    example: 'https://meet.google.com/xyz-abc-123',
  })
  @IsOptional()
  @IsString()
  meetingLink?: string;

  @ApiPropertyOptional({
    description: 'Mode of the session (e.g., video, phone, in_person)',
    example: 'video',
    default: 'video',
  })
  @IsOptional()
  @IsString()
  mode?: string;
}
