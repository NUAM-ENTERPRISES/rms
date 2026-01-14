import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsISO8601 } from 'class-validator';

export class SubmitProcessingStepDateDto {
  @ApiPropertyOptional({ description: 'Submitted at timestamp (ISO 8601). If omitted, server time will be used.' })
  @IsOptional()
  @IsISO8601()
  submittedAt?: string;
}
