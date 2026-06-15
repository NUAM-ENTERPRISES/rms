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
  OmitType(CreateCandidateDto, ['addressPincode', 'alternatePhone'] as const),
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
}
