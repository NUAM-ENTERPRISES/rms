import { IsOptional, IsEnum, IsBoolean, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum PrometricResultValues {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
}

export enum EmigrationStatusValues {
  PENDING = 'PENDING',
  FAILED = 'FAILED',
  COMPLETED = 'COMPLETED',
}

export class CompleteProcessingStepDto {
  @ApiPropertyOptional({ description: 'Prometric result (required for prometric step)', enum: PrometricResultValues })
  @IsOptional()
  @IsEnum(PrometricResultValues)
  prometricResult?: PrometricResultValues;

  @ApiPropertyOptional({ description: 'Emigration result (required when completing an emigration step)', enum: EmigrationStatusValues })
  @IsOptional() // requiredness enforced at service-level when step.template.key === 'emigration'
  @IsEnum(EmigrationStatusValues)
  emigrationStatus?: EmigrationStatusValues;

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
