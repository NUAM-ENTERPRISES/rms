import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
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

  @ApiPropertyOptional({
    description:
      'When cancelling Data Flow, optionally restrict candidate from project destination country',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  applyCountryRestriction?: boolean;

  @ApiPropertyOptional({
    description:
      'Destination country code to restrict when cancelling Data Flow (sent with applyCountryRestriction)',
    example: 'SA',
  })
  @IsOptional()
  @IsString()
  restrictCountryCode?: string;
}
