import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

function emptyToUndefined({ value }: { value: unknown }): unknown {
  if (value === '' || value === null) return undefined;
  return value;
}

export class BulkResumeParseDto {
  @ApiPropertyOptional({
    description:
      'Optional profession type. When omitted, the default active profession type is used.',
    example: 'pt_nurse_seed001',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  professionTypeId?: string;

  @ApiPropertyOptional({
    description: 'Candidate source (defaults to direct_application)',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;

  @ApiPropertyOptional({
    description: 'Optional role catalog ID for attached resume documents',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  roleCatalogId?: string;
}

export class BulkResumeDraftEducationDto {
  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  rawDegree?: string;

  @ApiPropertyOptional({
    description: 'Qualification catalog ID when matched or selected in review',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  qualificationId?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  university?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1950)
  @Max(2035)
  graduationYear?: number;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkResumeDraftWorkExperienceDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  jobTitle!: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(150)
  companyName?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(150)
  location?: string;

  @ApiPropertyOptional({
    description: 'ISO date YYYY-MM-DD',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class BulkResumeDraftDto {
  @ApiProperty({ description: 'Draft ID from parse step (temp file key)' })
  @IsString()
  @IsNotEmpty()
  draftId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName!: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{0,3}$/, {
    message: 'Please provide a valid country code (e.g., +91)',
  })
  countryCode?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @Matches(/^\d{6,15}$/, {
    message: 'Please provide a valid mobile number (6-15 digits)',
  })
  mobileNumber?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  passportNumber?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ type: [BulkResumeDraftEducationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkResumeDraftEducationDto)
  educations?: BulkResumeDraftEducationDto[];

  @ApiPropertyOptional({ type: [BulkResumeDraftWorkExperienceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkResumeDraftWorkExperienceDto)
  workExperiences?: BulkResumeDraftWorkExperienceDto[];
}

export class BulkCreateFromDraftsDto {
  @ApiPropertyOptional({
    description:
      'Optional profession type. When omitted, the default active profession type is used.',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  professionTypeId?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  roleCatalogId?: string;

  @ApiProperty({ type: [BulkResumeDraftDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkResumeDraftDto)
  drafts!: BulkResumeDraftDto[];
}

export type BulkResumeDraftEducation = {
  rawDegree?: string;
  qualificationId?: string;
  university?: string;
  graduationYear?: number;
  notes?: string;
};

export type BulkResumeDraftWorkExperience = {
  jobTitle: string;
  companyName?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
};

export type BulkResumeDraft = {
  draftId: string;
  fileName: string;
  parseWarnings: string[];
  firstName: string;
  lastName: string;
  email?: string;
  countryCode?: string;
  mobileNumber?: string;
  passportNumber?: string;
  dateOfBirth?: string;
  address?: string;
  educations: BulkResumeDraftEducation[];
  workExperiences: BulkResumeDraftWorkExperience[];
};

export type BulkResumeParseResult = {
  drafts: BulkResumeDraft[];
  failed: Array<{ fileName: string; reason: string }>;
  professionTypeId: string;
  source: string;
  roleCatalogId?: string;
};

export type BulkResumeCreatedItem = {
  candidateId: string;
  fileName: string;
  firstName: string;
  lastName: string;
  qualificationCount: number;
  workExperienceCount: number;
};

export type BulkResumeFailedItem = {
  fileName: string;
  reason: string;
};

export type BulkCreateFromResumesResult = {
  created: BulkResumeCreatedItem[];
  failed: BulkResumeFailedItem[];
};
