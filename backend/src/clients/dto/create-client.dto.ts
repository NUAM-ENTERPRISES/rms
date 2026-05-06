import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClientType } from '@prisma/client';

export class CreateClientSubClientDto {
  @ApiProperty({ description: 'Sub-client (end client) name' })
  @IsString()
  @MaxLength(512)
  name: string;

  @ApiPropertyOptional({
    description:
      'Sub-client taxonomy (defaults to DIRECT_CLIENT when omitted)',
    enum: ClientType,
    example: ClientType.DIRECT_CLIENT,
  })
  @IsOptional()
  @IsEnum(ClientType)
  type?: ClientType;

  @ApiPropertyOptional({ description: 'Sub-client email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Sub-client phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Sub-client address line' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description:
      'Physical country (`countries.code`) for sub-client mailing address',
  })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  addressCountryCode?: string;

  @ApiPropertyOptional({
    description: 'Physical state (`states.id`) for sub-client',
  })
  @IsOptional()
  @IsString()
  addressStateId?: string;
}

export class CreateClientDto {
  @ApiProperty({ description: 'Client name' })
  @IsString()
  @MaxLength(512)
  name: string;

  @ApiProperty({
    description: 'Client type',
    enum: ClientType,
    example: ClientType.DIRECT_CLIENT,
  })
  @IsEnum(ClientType)
  type: ClientType;

  /** Optional: link an end-client when type is SUB_AGENT or FREELANCE */
  @ApiPropertyOptional({ type: () => CreateClientSubClientDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateClientSubClientDto)
  subClient?: CreateClientSubClientDto;

  @ApiPropertyOptional({ description: 'Point of contact name' })
  @IsOptional()
  @IsString()
  pointOfContact?: string;

  @ApiPropertyOptional({ description: 'Client email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Client phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Client address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Physical / mailing country (`countries.code`)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  addressCountryCode?: string;

  @ApiPropertyOptional({
    description: 'Physical / mailing state (`states.id`)',
  })
  @IsOptional()
  @IsString()
  addressStateId?: string;

  // Individual Referrer specific fields
  @ApiPropertyOptional({ description: 'Profession (for individual referrers)' })
  @IsOptional()
  @IsString()
  profession?: string;

  @ApiPropertyOptional({
    description: 'Organization (for individual referrers)',
  })
  @IsOptional()
  @IsString()
  organization?: string;

  @ApiPropertyOptional({
    description: 'Relationship type (for individual referrers)',
    enum: ['CURRENT_EMPLOYEE', 'FORMER_EMPLOYEE', 'NETWORK_CONTACT'],
  })
  @IsOptional()
  @IsEnum(['CURRENT_EMPLOYEE', 'FORMER_EMPLOYEE', 'NETWORK_CONTACT'])
  relationship?: 'CURRENT_EMPLOYEE' | 'FORMER_EMPLOYEE' | 'NETWORK_CONTACT';

  @ApiPropertyOptional({
    description: 'Agency type (for sub-agencies)',
    enum: ['LOCAL', 'REGIONAL', 'SPECIALIZED'],
  })
  @IsOptional()
  @IsEnum(['LOCAL', 'REGIONAL', 'SPECIALIZED'])
  agencyType?: 'LOCAL' | 'REGIONAL' | 'SPECIALIZED';

  @ApiPropertyOptional({
    description: 'Specialties (for sub-agencies)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @ApiPropertyOptional({
    description: 'Facility type (for healthcare organizations)',
    enum: ['HOSPITAL', 'CLINIC', 'NURSING_HOME', 'MEDICAL_CENTER'],
  })
  @IsOptional()
  @IsEnum(['HOSPITAL', 'CLINIC', 'NURSING_HOME', 'MEDICAL_CENTER'])
  facilityType?: 'HOSPITAL' | 'CLINIC' | 'NURSING_HOME' | 'MEDICAL_CENTER';

  @ApiPropertyOptional({
    description: 'Facility size (for healthcare organizations)',
    enum: ['SMALL', 'MEDIUM', 'LARGE'],
  })
  @IsOptional()
  @IsEnum(['SMALL', 'MEDIUM', 'LARGE'])
  facilitySize?: 'SMALL' | 'MEDIUM' | 'LARGE';

  @ApiPropertyOptional({
    description: 'Locations (for healthcare organizations)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  locations?: string[];

  @ApiPropertyOptional({
    description: 'Source type (for external sources)',
    enum: [
      'JOB_BOARD',
      'SOCIAL_MEDIA',
      'REFERRAL_PLATFORM',
      'INDUSTRY_EVENT',
      'COLD_OUTREACH',
      'OTHER',
    ],
  })
  @IsOptional()
  @IsEnum([
    'JOB_BOARD',
    'SOCIAL_MEDIA',
    'REFERRAL_PLATFORM',
    'INDUSTRY_EVENT',
    'COLD_OUTREACH',
    'OTHER',
  ])
  sourceType?:
    | 'JOB_BOARD'
    | 'SOCIAL_MEDIA'
    | 'REFERRAL_PLATFORM'
    | 'INDUSTRY_EVENT'
    | 'COLD_OUTREACH'
    | 'OTHER';

  @ApiPropertyOptional({ description: 'Source name (for external sources)' })
  @IsOptional()
  @IsString()
  sourceName?: string;

  @ApiPropertyOptional({
    description: 'Acquisition method (for external sources)',
    enum: ['ORGANIC', 'PAID', 'PARTNERSHIP', 'REFERRAL'],
  })
  @IsOptional()
  @IsEnum(['ORGANIC', 'PAID', 'PARTNERSHIP', 'REFERRAL'])
  acquisitionMethod?: 'ORGANIC' | 'PAID' | 'PARTNERSHIP' | 'REFERRAL';

  @ApiPropertyOptional({ description: 'Source notes (for external sources)' })
  @IsOptional()
  @IsString()
  sourceNotes?: string;

  @ApiPropertyOptional({
    description: 'Relationship type (for financial tracking)',
    enum: ['REFERRAL', 'PARTNERSHIP', 'DIRECT_CLIENT', 'EXTERNAL_SOURCE'],
  })
  @IsOptional()
  @IsEnum(['REFERRAL', 'PARTNERSHIP', 'DIRECT_CLIENT', 'EXTERNAL_SOURCE'])
  relationshipType?:
    | 'REFERRAL'
    | 'PARTNERSHIP'
    | 'DIRECT_CLIENT'
    | 'EXTERNAL_SOURCE';

  @ApiPropertyOptional({ description: 'Commission rate (percentage)' })
  @IsOptional()
  @IsNumber()
  commissionRate?: number;

  @ApiPropertyOptional({ description: 'Payment terms' })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional({ description: 'Contract start date' })
  @IsOptional()
  @IsDateString()
  contractStartDate?: string;

  @ApiPropertyOptional({ description: 'Contract end date' })
  @IsOptional()
  @IsDateString()
  contractEndDate?: string;

  @ApiPropertyOptional({ description: 'Billing address' })
  @IsOptional()
  @IsString()
  billingAddress?: string;

  @ApiPropertyOptional({ description: 'Tax ID' })
  @IsOptional()
  @IsString()
  taxId?: string;
}
