import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateMergedAttestationUploadDto {
  @ApiProperty({ description: 'Selected project id (country comes from project)' })
  @IsString()
  @MinLength(1)
  projectId!: string;

  @ApiProperty({
    type: [String],
    example: ['sslc_certificate_attested', 'plus_two_certificate_attested'],
    description:
      'Attested document type keys covered by this single merged PDF (at least 2)',
  })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @ArrayMinSize(2)
  @ArrayUnique()
  @IsString({ each: true })
  docTypes!: string[];

  @ApiPropertyOptional({ description: 'Optional remarks for this upload' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;
}
