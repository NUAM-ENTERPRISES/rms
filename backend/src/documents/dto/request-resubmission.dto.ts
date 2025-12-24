import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestResubmissionDto {
  @ApiProperty({
    description: 'Candidate Project Map ID',
    example: 'cpm_123abc',
  })
  @IsString()
  candidateProjectMapId: string;

  @ApiPropertyOptional({
    description: 'Role Catalog ID',
    example: 'rc_123abc',
  })
  @IsString()
  @IsOptional()
  roleCatalogId?: string;

  @ApiProperty({
    description: 'Reason for resubmission request',
    example: 'Document is unclear, please upload a higher quality scan',
  })
  @IsString()
  reason: string;
}
