import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class OfficeAddressPresetDto {
  @ApiProperty({ example: 'Kochi Office' })
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiProperty({ example: 'Affiniks Kochi Office, MG Road, Kochi' })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({ example: 'IN', default: 'IN' })
  @IsString()
  @IsNotEmpty()
  addressCountryCode!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  addressStateId?: string | null;

  @ApiPropertyOptional({ example: '682016' })
  @IsOptional()
  @IsString()
  pincode?: string;

  @ApiPropertyOptional({ example: '+91 484 000 0000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '+91 484 000 0001' })
  @IsOptional()
  @IsString()
  altPhone?: string;
}

export class UpdateOfficeAddressesDto {
  @ApiProperty({ type: OfficeAddressPresetDto })
  @ValidateNested()
  @Type(() => OfficeAddressPresetDto)
  kochi!: OfficeAddressPresetDto;

  @ApiProperty({ type: OfficeAddressPresetDto })
  @ValidateNested()
  @Type(() => OfficeAddressPresetDto)
  delhi!: OfficeAddressPresetDto;
}
