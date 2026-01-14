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
    description: 'Role Catalog ID (accepted as `roleCatalog`; `roleCatalogId` and common typo `roleCatelogId` supported for backward compatibility)',
    example: 'rc_123abc',
  })
  @IsString()
  @IsOptional()
  roleCatalog?: string;

  @ApiPropertyOptional({
    description: 'Alias for `roleCatalog` - `roleCatalogId` (backward compatibility)',
    example: 'rc_123abc',
  })
  @IsString()
  @IsOptional()
  roleCatalogId?: string;

  @ApiPropertyOptional({
    description: 'Common frontend typo alias: `roleCatelogId` (backward compatibility)',
    example: 'rc_123abc',
  })
  @IsString()
  @IsOptional()
  roleCatelogId?: string;

  @ApiProperty({
    description: 'Reason for resubmission request',
    example: 'Document is unclear, please upload a higher quality scan',
  })
  @IsString()
  reason: string;
}
