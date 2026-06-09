import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { CANDIDATE_PROJECT_STATUS_CHANGE_TARGET_STATUSES } from '../../common/constants/statuses';

export class CreateStatusChangeRequestDto {
  @ApiProperty({
    description: 'Candidate-project mapping ID',
    example: 'cmq6b8m1x0001q4kj8ebdskyu',
  })
  @IsString()
  @IsNotEmpty()
  candidateProjectMapId!: string;

  @ApiProperty({
    description: 'Target status for the candidate project',
    enum: CANDIDATE_PROJECT_STATUS_CHANGE_TARGET_STATUSES,
    example: 'withdrawn',
  })
  @IsString()
  @IsIn([...CANDIDATE_PROJECT_STATUS_CHANGE_TARGET_STATUSES])
  requestedStatus!: string;

  @ApiProperty({
    description: 'Mandatory reason / remarks for the status change request',
    example: 'Candidate declined to proceed with this project.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  reason!: string;
}
