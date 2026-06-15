import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  ADDRESS_TYPES,
  DELIVERY_MODES,
  SHIPMENT_PURPOSES,
} from '../constants/shipment-types';
import { AddressSnapshotDto } from './address-snapshot.dto';

export class CreateShipmentDto {
  @ApiProperty()
  @IsString()
  candidateId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({ enum: SHIPMENT_PURPOSES })
  @IsIn(SHIPMENT_PURPOSES)
  purposeType!: string;

  @ApiProperty({ enum: DELIVERY_MODES })
  @IsIn(DELIVERY_MODES)
  deliveryMode!: string;

  @ApiProperty({ enum: ADDRESS_TYPES })
  @IsIn(ADDRESS_TYPES)
  fromAddressType!: string;

  @ApiProperty({ enum: ADDRESS_TYPES })
  @IsIn(ADDRESS_TYPES)
  toAddressType!: string;

  @ApiPropertyOptional({ type: AddressSnapshotDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressSnapshotDto)
  fromAddressSnapshot?: AddressSnapshotDto;

  @ApiPropertyOptional({ type: AddressSnapshotDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressSnapshotDto)
  toAddressSnapshot?: AddressSnapshotDto;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  docTypes!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;
}
