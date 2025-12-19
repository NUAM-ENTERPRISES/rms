import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { SCREENING_DECISION } from '../../../common/constants/statuses';

export class QueryScreeningsDto {
  @ApiProperty({
    description: 'Filter by candidate-project map ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  candidateProjectMapId?: string;

  @ApiProperty({
    description: 'Filter by coordinator ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  coordinatorId?: string;

  @ApiProperty({
    description: 'Filter by decision',
    enum: SCREENING_DECISION,
    required: false,
  })
  @IsOptional()
  @IsEnum(SCREENING_DECISION)
  decision?: string;
}
