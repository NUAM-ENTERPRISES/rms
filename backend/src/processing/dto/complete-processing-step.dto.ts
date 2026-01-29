import { IsOptional, IsEnum, IsBoolean, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteProcessingStepDto {


  @ApiPropertyOptional({ description: 'MOFA number (optional for medical step)', example: 'MOFA-12345' })
  @IsOptional()
  @IsString()
  mofaNumber?: string;

  @ApiPropertyOptional({ description: 'Whether the candidate passed medical (required for medical step)' })
  @IsOptional()
  @IsBoolean()
  isMedicalPassed?: boolean;

  @ApiPropertyOptional({ description: 'Optional note to store in processing history or cancellation reason', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
