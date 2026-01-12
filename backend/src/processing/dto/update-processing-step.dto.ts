import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProcessingStepDto {
  @ApiPropertyOptional({ description: 'New status', example: 'completed' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Assigned user id', example: 'user_123' })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Rejection reason', example: 'Incorrect document' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional({ description: 'Due date for the step', example: '2025-12-31T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}