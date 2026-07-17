import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class TransferAssignmentDto {
  @ApiProperty({
    description: 'Active peer recruiter receiving these candidates',
    example: 'clh1234567890',
  })
  @IsString()
  @IsNotEmpty()
  targetRecruiterId!: string;

  @ApiProperty({
    description: 'Positive candidate IDs assigned to this peer',
    type: [String],
    example: ['clh111', 'clh222'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  candidateIds!: string[];
}

export class TransferCountryCoverageDto {
  @ApiProperty({
    description:
      'Destination country code the source recruiter will cover after transfer. Use GCC to assign all GCC countries (SA, AE, QA, OM, BH, KW).',
    example: 'IE',
  })
  @IsString()
  @IsNotEmpty()
  destinationCountryCode!: string;

  @ApiPropertyOptional({
    description:
      'Manual per-peer candidate assignments. Required when positives exist and evenSplitAcrossRecruiterIds is omitted. Union of candidateIds must equal the full positive set; IDs must not overlap.',
    type: [TransferAssignmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferAssignmentDto)
  assignments?: TransferAssignmentDto[];

  @ApiPropertyOptional({
    description:
      'When set (and assignments omitted), server loads all positive candidates and partitions them evenly across these peer recruiter IDs (sorted for stable order). Mutually exclusive with assignments.',
    type: [String],
    example: ['peerJohn', 'peerAysa'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  evenSplitAcrossRecruiterIds?: string[];

  @ApiProperty({
    description: 'Reason recorded on candidate assignments and audit',
    example: 'GCC has no open projects; moving coverage to Ireland',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
