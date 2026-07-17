import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class TransferCountryCoverageDto {
  @ApiProperty({
    description: 'Destination country code the source recruiter will cover after transfer',
    example: 'IE',
  })
  @IsString()
  @IsNotEmpty()
  destinationCountryCode!: string;

  @ApiPropertyOptional({
    description:
      'Peer recruiter who covers the same source country/GCC and receives positive candidates. Required when the source recruiter has positive candidates.',
    example: 'clh1234567890',
  })
  @IsOptional()
  @IsString()
  targetRecruiterId?: string;

  @ApiProperty({
    description:
      'All positive candidate IDs currently assigned to the source recruiter. Must match the full positive set (empty when none).',
    type: [String],
    example: ['clh111', 'clh222'],
  })
  @IsArray()
  @IsString({ each: true })
  candidateIds!: string[];

  @ApiPropertyOptional({
    description: 'Optional reason recorded on candidate assignments and audit',
    example: 'GCC has no open projects; moving coverage to Ireland',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
