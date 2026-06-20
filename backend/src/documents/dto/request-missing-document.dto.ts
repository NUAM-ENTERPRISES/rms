import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional } from 'class-validator';

export class RequestMissingDocumentDto {
  @ApiProperty({
    description: 'Candidate Project Map ID',
    example: 'cpm_123abc',
  })
  @IsString()
  candidateProjectMapId: string;

  @ApiProperty({
    description: 'Document type key matching a project requirement',
    example: 'passport',
  })
  @IsString()
  docType: string;

  @ApiProperty({
    description: 'Reason for requesting the recruiter to upload the missing document',
    example: 'Passport copy is required before verification can continue.',
  })
  @IsString()
  @MinLength(10)
  reason: string;

  @ApiPropertyOptional({
    description: 'Role Catalog ID for role-scoped document linking',
    example: 'rc_123abc',
  })
  @IsString()
  @IsOptional()
  roleCatalogId?: string;
}
