import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({ description: 'Client name' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Client type',
    enum: [
      'INDIVIDUAL',
      'SUB_AGENCY',
      'HEALTHCARE_ORGANIZATION',
      'EXTERNAL_SOURCE',
    ],
  })
  @IsEnum([
    'INDIVIDUAL',
    'SUB_AGENCY',
    'HEALTHCARE_ORGANIZATION',
    'EXTERNAL_SOURCE',
  ])
  type:
    | 'INDIVIDUAL'
    | 'SUB_AGENCY'
    | 'HEALTHCARE_ORGANIZATION'
    | 'EXTERNAL_SOURCE';

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

  // Sub-Agency specific fields
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

  // Healthcare Organization specific fields
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

  // External Source specific fields
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

  // Optional financial fields
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
