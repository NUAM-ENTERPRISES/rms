import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DOCUMENT_STATUS } from '../../common/constants';

export class VerifyDocumentDto {
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

  @ApiPropertyOptional({
    description: 'Role Catalog (accepted as `roleCatalog`; `roleCatalogId` and common typo `roleCatelogId` supported)',
    example: 'rc_123abc',
  })
  @IsString()
  @IsOptional()
  roleCatalog?: string;

  @ApiPropertyOptional({
    description: 'Common frontend typo alias: `roleCatelogId` (backward compatibility)',
    example: 'rc_123abc',
  })
  @IsString()
  @IsOptional()
  roleCatelogId?: string;

  @ApiProperty({
    description: 'Verification status',
    enum: [DOCUMENT_STATUS.VERIFIED, DOCUMENT_STATUS.REJECTED],
    example: DOCUMENT_STATUS.VERIFIED,
  })
  @IsEnum(DOCUMENT_STATUS)  
  status: string;

  @ApiPropertyOptional({
    description: 'Verification notes',
    example: 'Document verified successfully',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Rejection reason (required if status is rejected)',
    example: 'Document expired',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
