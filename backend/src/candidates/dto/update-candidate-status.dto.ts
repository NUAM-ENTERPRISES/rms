import { IsString, IsEnum, IsOptional, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CANDIDATE_STATUS } from '../../common/constants/statuses';

export class UpdateCandidateStatusDto {
  @ApiProperty({
    description: 'New status ID for the candidate',
    example: 1,
  })

  @IsInt()
  currentStatusId: number;

  @ApiProperty({
    description: 'Reason for status change (optional)',
    example: 'Candidate showed interest in the position',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'On-hold duration in days for status "On Hold"',
    example: 14,
  })
  @IsOptional()
  @IsInt()
  onHoldDurationDays?: number;

  @ApiPropertyOptional({
    description: 'Target year for status "Future" (e.g., 2027)',
    example: 2027,
  })
  @IsOptional()
  @IsInt()
  futureYear?: number;
}
