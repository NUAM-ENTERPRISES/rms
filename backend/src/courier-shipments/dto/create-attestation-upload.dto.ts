import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAttestationUploadDto {
  @ApiProperty({ description: 'Selected project id (country comes from project)' })
  @IsString()
  @MinLength(1)
  projectId!: string;

  @ApiProperty({
    example: 'degree_certificate_attested',
    description: 'Single attested document type key',
  })
  @IsString()
  @MinLength(1)
  docType!: string;

  @ApiPropertyOptional({ description: 'Optional remarks for this upload' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;
}
