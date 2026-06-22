import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelProcessingStepDto {
  @ApiPropertyOptional({ description: 'Optional cancellation reason to store in step.rejectionReason and history', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @ApiPropertyOptional({
    description:
      'When cancelling Data Flow, optionally restrict candidate from project destination country',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  applyCountryRestriction?: boolean;

  @ApiPropertyOptional({
    description:
      'Destination country code to restrict when cancelling Data Flow',
    example: 'SA',
  })
  @IsOptional()
  @IsString()
  restrictCountryCode?: string;
}
