import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { 
  CANDIDATE_PROJECT_STATUS_CHANGE_TARGET_STATUSES,
  STATUS_CHANGE_REQUEST_TYPES,
} from '../../common/constants/statuses';

export class CreateStatusChangeRequestDto {
  @ApiProperty({
    description: 'Candidate-project mapping ID',
    example: 'cmq6b8m1x0001q4kj8ebdskyu',
  })
  @IsString()
  @IsNotEmpty()
  candidateProjectMapId!: string;

  @ApiProperty({
    description: 'Type of request: block (to Withdrawn/On Hold) or reactivate (return to last active status)',
    enum: ['block', 'reactivate'],
    default: 'block',
    example: 'block',
  })
  @IsEnum(['block', 'reactivate'])
  @IsNotEmpty()
  requestType!: 'block' | 'reactivate';

  @ApiProperty({
    description: 'Target status for block requests. Not used for reactivate.',
    enum: CANDIDATE_PROJECT_STATUS_CHANGE_TARGET_STATUSES,
    example: 'withdrawn',
    required: false,
  })
  @ValidateIf((o) => o.requestType === 'block')
  @IsString()
  @IsNotEmpty()
  @IsIn([...CANDIDATE_PROJECT_STATUS_CHANGE_TARGET_STATUSES])
  requestedStatus?: string;

  @ApiProperty({
    description: 'Mandatory reason / remarks for the status change request',
    example: 'Candidate declined to proceed with this project.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  reason!: string;
}
