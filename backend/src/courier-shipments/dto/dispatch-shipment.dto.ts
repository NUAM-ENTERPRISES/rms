import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { COURIER_PARTNERS } from '../constants/shipment-types';

export class DispatchShipmentDto {
  @ApiPropertyOptional({ description: 'Courier tracking number (optional at dispatch)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  trackingId?: string;

  @ApiPropertyOptional({ enum: COURIER_PARTNERS })
  @IsOptional()
  @IsIn(COURIER_PARTNERS)
  courierPartner?: string;

  @ApiProperty()
  @IsDateString()
  sentAt!: string;

  @ApiProperty()
  @IsString()
  sentByUserId!: string;

  @ApiProperty()
  @IsString()
  approvedByUserId!: string;
}
