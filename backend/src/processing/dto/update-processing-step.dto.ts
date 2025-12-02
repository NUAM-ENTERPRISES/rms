import { ApiProperty } from '@nestjs/swagger';
import { ProcessingStepStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProcessingStepDto {
  @ApiProperty({ enum: ProcessingStepStatus })
  @IsEnum(ProcessingStepStatus)
  status!: ProcessingStepStatus;

  @ApiProperty({
    required: false,
    description: 'Internal notes for this update',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({
    required: false,
    description:
      'Reason when marking a step as not applicable or rejected (optional otherwise)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notApplicableReason?: string;
}
