import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { CreateCandidateDto } from './create-candidate.dto';

function trimToNullOrUndefined(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized =
    typeof value === 'string'
      ? value
      : typeof value === 'number'
        ? String(value)
        : undefined;
  if (normalized === undefined) return undefined;
  const trimmed = normalized.trim();
  return trimmed ? trimmed : null;
}

export class UpdateCandidateDto extends PartialType(
  OmitType(CreateCandidateDto, [
    'addressPincode',
    'alternatePhone',
    'currentContactCountryCode',
    'currentContactNumber',
    'currentAddressCountryCode',
    'currentAddressStateId',
    'currentAddress',
    'currentAddressPincode',
  ] as const),
) {
  @ApiPropertyOptional({
    description: 'Postal / PIN code for mailing address',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) => trimToNullOrUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(12)
  addressPincode?: string | null;

  @ApiPropertyOptional({
    description: 'Alternate contact phone number',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) => trimToNullOrUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(15)
  @Matches(/^[\d+\-\s()]*$/, {
    message: 'Alternate phone may only contain digits, spaces, and + - ( )',
  })
  alternatePhone?: string | null;

  @ApiPropertyOptional({
    description:
      'Current / overseas contact calling code after hire. Distinct from original `countryCode`.',
    nullable: true,
    example: '+971',
  })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @Transform(({ value }) => trimToNullOrUndefined(value))
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{0,3}$/, {
    message: 'Please provide a valid country code (e.g., +91, +1, +44)',
  })
  currentContactCountryCode?: string | null;

  @ApiPropertyOptional({
    description:
      'Current / overseas contact number after hire, without calling code.',
    nullable: true,
    example: '501234567',
  })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @Transform(({ value }) => trimToNullOrUndefined(value))
  @IsOptional()
  @IsString()
  @Matches(/^\d{6,15}$/, {
    message: 'Please provide a valid mobile number (6-15 digits)',
  })
  currentContactNumber?: string | null;

  @ApiPropertyOptional({
    description: 'Current / overseas physical country (`countries.code`)',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) => trimToNullOrUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(8)
  currentAddressCountryCode?: string | null;

  @ApiPropertyOptional({
    description: 'Current / overseas physical state (`states.id`)',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) => trimToNullOrUndefined(value))
  @IsOptional()
  @IsString()
  currentAddressStateId?: string | null;

  @ApiPropertyOptional({
    description: 'Current / overseas street address after hire',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) => trimToNullOrUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  currentAddress?: string | null;

  @ApiPropertyOptional({
    description: 'Postal / PIN code for current / overseas address',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) => trimToNullOrUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(12)
  currentAddressPincode?: string | null;
}
