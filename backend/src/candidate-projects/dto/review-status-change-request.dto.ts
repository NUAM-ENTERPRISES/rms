import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ReviewStatusChangeRequestDto {
  @ApiPropertyOptional({
    description: 'Optional notes from the reviewer when approving or rejecting',
  })
  @IsString()
  @IsOptional()
  reviewNotes?: string;

  @ApiPropertyOptional({
    description:
      'When approving a processing cancel that requested a country restriction, set to false to skip applying the restriction. Defaults to true when omitted.',
  })
  @IsBoolean()
  @IsOptional()
  applyCountryRestriction?: boolean;
}
