import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { STATUS_CHANGE_REQUEST_TYPES } from '../../common/constants/statuses';

export class CreateProcessingStatusChangeRequestDto {
  @ApiProperty({
    description: 'Processing step ID from which the cancel/hold request originates',
    example: 'cmq6b8m1x0001q4kj8ebdskyu',
  })
  @IsString()
  @IsNotEmpty()
  processingStepId!: string;

  @ApiProperty({
    description: 'Type of processing status change request',
    enum: [
      STATUS_CHANGE_REQUEST_TYPES.PROCESSING_CANCEL,
      STATUS_CHANGE_REQUEST_TYPES.PROCESSING_HOLD,
    ],
    example: STATUS_CHANGE_REQUEST_TYPES.PROCESSING_CANCEL,
  })
  @IsEnum([
    STATUS_CHANGE_REQUEST_TYPES.PROCESSING_CANCEL,
    STATUS_CHANGE_REQUEST_TYPES.PROCESSING_HOLD,
  ])
  @IsNotEmpty()
  requestType!:
    | typeof STATUS_CHANGE_REQUEST_TYPES.PROCESSING_CANCEL
    | typeof STATUS_CHANGE_REQUEST_TYPES.PROCESSING_HOLD;

  @ApiProperty({
    description: 'Mandatory reason for the cancel/hold request',
    example: 'Candidate withdrew after medical examination.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  reason!: string;
}
