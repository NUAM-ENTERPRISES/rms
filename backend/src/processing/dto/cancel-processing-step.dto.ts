import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelProcessingStepDto {
  @ApiPropertyOptional({ description: 'Optional cancellation reason to store in step.rejectionReason and history', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
