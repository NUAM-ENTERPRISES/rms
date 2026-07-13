import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { COURIER_PARTNERS } from '../constants/shipment-types';

export class UpdateCourierTrackingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  trackingId?: string;

  @ApiPropertyOptional({ enum: COURIER_PARTNERS })
  @IsOptional()
  @IsIn(COURIER_PARTNERS)
  courierPartner?: string;
}
