import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { MOCK_INTERVIEW_DECISION } from '../../../common/constants/statuses';

export class QueryMockInterviewsDto {
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
    enum: MOCK_INTERVIEW_DECISION,
    required: false,
  })
  @IsOptional()
  @IsEnum(MOCK_INTERVIEW_DECISION)
  decision?: string;
}
