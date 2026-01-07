import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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

export class BulkUpdateItemDto extends UpdateInterviewStatusDto {
  @ApiProperty({ description: 'Interview ID to update' })
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class BulkUpdateInterviewStatusDto {
  @ApiProperty({ type: [BulkUpdateItemDto], description: 'Array of status updates' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateItemDto)
  updates: BulkUpdateItemDto[];
}
