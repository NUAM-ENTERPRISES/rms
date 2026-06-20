import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsString, MaxLength } from 'class-validator';
import { COURIER_PARTNERS } from '../constants/shipment-types';

export class DispatchShipmentDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  trackingId!: string;

  @ApiProperty({ enum: COURIER_PARTNERS })
  @IsIn(COURIER_PARTNERS)
  courierPartner!: string;

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
