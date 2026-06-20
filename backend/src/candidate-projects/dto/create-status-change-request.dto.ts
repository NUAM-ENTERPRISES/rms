import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  CANDIDATE_PROJECT_STATUS_CHANGE_TARGET_STATUSES,
  PROCESSING_STATUS_CHANGE_TARGET_STATUSES,
  STATUS_CHANGE_REQUEST_TYPES,
  isProcessingStatusChangeRequestType,
} from '../../common/constants/statuses';

const ALL_REQUEST_TYPES = [
  STATUS_CHANGE_REQUEST_TYPES.BLOCK,
  STATUS_CHANGE_REQUEST_TYPES.REACTIVATE,
  STATUS_CHANGE_REQUEST_TYPES.PROCESSING_CANCEL,
  STATUS_CHANGE_REQUEST_TYPES.PROCESSING_HOLD,
  STATUS_CHANGE_REQUEST_TYPES.PROCESSING_REACTIVATE,
] as const;

export class CreateStatusChangeRequestDto {
  @ApiProperty({
    description: 'Candidate-project mapping ID',
    example: 'cmq6b8m1x0001q4kj8ebdskyu',
  })
  @IsString()
  @IsNotEmpty()
  candidateProjectMapId!: string;

  @ApiProperty({
    description:
      'Type of request: block, reactivate, processing_cancel, processing_hold, or processing_reactivate',
    enum: ALL_REQUEST_TYPES,
    default: 'block',
    example: 'block',
  })
  @IsEnum(ALL_REQUEST_TYPES)
  @IsNotEmpty()
  requestType!: (typeof ALL_REQUEST_TYPES)[number];

  @ApiPropertyOptional({
    description: 'Target status for block or processing requests',
    example: 'withdrawn',
  })
  @ValidateIf((o) => o.requestType === STATUS_CHANGE_REQUEST_TYPES.BLOCK)
  @IsString()
  @IsNotEmpty()
  @IsIn([...CANDIDATE_PROJECT_STATUS_CHANGE_TARGET_STATUSES])
  requestedStatus?: string;

  @ApiPropertyOptional({
    description: 'Processing step ID (required for processing status change requests)',
  })
  @ValidateIf((o) => isProcessingStatusChangeRequestType(o.requestType))
  @IsString()
  @IsNotEmpty()
  processingStepId?: string;

  @ApiPropertyOptional({ description: 'Processing step template key at time of request' })
  @IsOptional()
  @IsString()
  stepKey?: string;

  @ApiPropertyOptional({ description: 'Processing candidate ID' })
  @IsOptional()
  @IsString()
  processingCandidateId?: string;

  @ApiProperty({
    description: 'Mandatory reason / remarks for the status change request',
    example: 'Candidate declined to proceed with this project.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  reason!: string;
}

export function resolveProcessingRequestedStatus(
  requestType: string,
): (typeof PROCESSING_STATUS_CHANGE_TARGET_STATUSES)[number] {
  if (requestType === STATUS_CHANGE_REQUEST_TYPES.PROCESSING_CANCEL) {
    return 'processing_cancelled';
  }
  if (requestType === STATUS_CHANGE_REQUEST_TYPES.PROCESSING_REACTIVATE) {
    return 'processing_in_progress';
  }
  return 'processing_hold';
}
