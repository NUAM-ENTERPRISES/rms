import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateInterviewStatusDto {
  @ApiPropertyOptional({ description: "New interview outcome/status (e.g., 'scheduled', 'completed', 'cancelled', 'no-show', 'passed', 'failed')" })
  @IsOptional()
  @IsString()
  interviewStatus?: string;

  @ApiPropertyOptional({ description: "Candidate project subStatus name to set (e.g., 'interview_scheduled', 'interview_completed')" })
  @IsOptional()
  @IsString()
  subStatus?: string;

  @ApiPropertyOptional({ description: 'Reason for the status change / human readable note' })
  @IsOptional()
  @IsString()
  reason?: string;
}
