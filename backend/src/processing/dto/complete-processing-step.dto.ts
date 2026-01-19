import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum PrometricResultValues {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
}

export class CompleteProcessingStepDto {
  @ApiPropertyOptional({ description: 'Prometric result (required for prometric step)', enum: PrometricResultValues })
  @IsOptional()
  @IsEnum(PrometricResultValues)
  prometricResult?: PrometricResultValues;
}
