import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SCREENING_DECISION } from '../../../common/constants/statuses';

export class UpdateScreeningDecisionDto {
  @ApiProperty({
    description: 'New decision for the screening',
    enum: SCREENING_DECISION,
    example: SCREENING_DECISION.APPROVED,
  })
  @IsEnum(SCREENING_DECISION)
  decision: string;

  @ApiProperty({
    description: 'Optional remark or reason for decision update',
    required: false,
  })
  @IsOptional()
  @IsString()
  remarks?: string;
}
