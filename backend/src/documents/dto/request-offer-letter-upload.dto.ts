import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional } from 'class-validator';

export class RequestOfferLetterUploadDto {
  @ApiProperty({
    description: 'Candidate Project Map ID',
    example: 'cpm_123abc',
  })
  @IsString()
  candidateProjectMapId: string;

  @ApiProperty({
    description:
      'Note for the recruiter explaining why the offer letter is needed',
    example:
      'Candidate passed the interview. Please call them to collect the signed offer letter before processing.',
  })
  @IsString()
  @MinLength(10)
  reason: string;

  @ApiPropertyOptional({
    description: 'Role Catalog ID for role-scoped offer letter linking',
    example: 'rc_123abc',
  })
  @IsString()
  @IsOptional()
  roleCatalogId?: string;
}
