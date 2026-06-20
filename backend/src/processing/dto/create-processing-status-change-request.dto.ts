import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { STATUS_CHANGE_REQUEST_TYPES } from '../../common/constants/statuses';

const PROCESSING_STATUS_CHANGE_REQUEST_TYPES = [
  STATUS_CHANGE_REQUEST_TYPES.PROCESSING_CANCEL,
  STATUS_CHANGE_REQUEST_TYPES.PROCESSING_HOLD,
  STATUS_CHANGE_REQUEST_TYPES.PROCESSING_REACTIVATE,
] as const;

export class CreateProcessingStatusChangeRequestDto {
  @ApiProperty({
    description: 'Processing step ID from which the status change request originates',
    example: 'cmq6b8m1x0001q4kj8ebdskyu',
  })
  @IsString()
  @IsNotEmpty()
  processingStepId!: string;

  @ApiProperty({
    description: 'Type of processing status change request',
    enum: PROCESSING_STATUS_CHANGE_REQUEST_TYPES,
    example: STATUS_CHANGE_REQUEST_TYPES.PROCESSING_CANCEL,
  })
  @IsEnum(PROCESSING_STATUS_CHANGE_REQUEST_TYPES)
  @IsNotEmpty()
  requestType!:
    | typeof STATUS_CHANGE_REQUEST_TYPES.PROCESSING_CANCEL
    | typeof STATUS_CHANGE_REQUEST_TYPES.PROCESSING_HOLD
    | typeof STATUS_CHANGE_REQUEST_TYPES.PROCESSING_REACTIVATE;

  @ApiProperty({
    description: 'Mandatory reason for the status change request',
    example: 'Candidate withdrew after medical examination.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  reason!: string;
}
