import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CANDIDATE_STATUS } from '../../common/constants/statuses';

export class UpdateCandidateStatusDto {
  @ApiProperty({
    description: 'New status for the candidate',
    enum: Object.values(CANDIDATE_STATUS),
    example: 'interested',
  })
  @IsEnum(Object.values(CANDIDATE_STATUS))
  status: string;

  @ApiProperty({
    description: 'Reason for status change (optional)',
    example: 'Candidate showed interest in the position',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
