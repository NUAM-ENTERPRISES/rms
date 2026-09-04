import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

class ProposedQualificationDto {
  @IsString()
  name!: string;

  @IsString()
  level!: string;

  @IsString()
  field!: string;

  @IsOptional()
  @IsString()
  shortName?: string;
}

class ProposedDepartmentDto {
  @IsString()
  name!: string;
}

class ProposedRoleDto {
  @IsString()
  label!: string;

  @IsOptional()
  @IsString()
  roleDepartmentId?: string;
}

class QualificationSuggestionDto {
  @IsString()
  id!: string;

  @IsString()
  rawLabel!: string;

  @IsOptional()
  @IsString()
  qualificationId?: string | null;

  @IsOptional()
  @IsString()
  qualificationLabel?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProposedQualificationDto)
  proposedNew?: ProposedQualificationDto | null;

  @IsOptional()
  @IsString()
  university?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2035)
  graduationYear?: number | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsBoolean()
  included!: boolean;
}

class WorkExperienceSuggestionDto {
  @IsString()
  id!: string;

  @IsString()
  departmentRaw!: string;

  @IsString()
  jobTitleRaw!: string;

  @IsOptional()
  @IsString()
  roleDepartmentId?: string | null;

  @IsOptional()
  @IsString()
  roleDepartmentLabel?: string | null;

  @IsOptional()
  @IsString()
  roleCatalogId?: string | null;

  @IsOptional()
  @IsString()
  roleCatalogLabel?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProposedDepartmentDto)
  proposedDepartment?: ProposedDepartmentDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProposedRoleDto)
  proposedRole?: ProposedRoleDto | null;

  @IsOptional()
  @IsString()
  companyName?: string | null;

  @IsString()
  startDate!: string;

  @IsOptional()
  @IsString()
  endDate?: string | null;

  @IsBoolean()
  isCurrent!: boolean;

  @IsArray()
  @IsString({ each: true })
  linkedSegmentIds!: string[];

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsBoolean()
  included!: boolean;
}

class ResumeRoleSuggestionDto {
  @IsOptional()
  @IsString()
  departmentId?: string | null;

  @IsOptional()
  @IsString()
  roleCatalogId?: string | null;

  @IsOptional()
  @IsString()
  departmentLabel?: string | null;

  @IsOptional()
  @IsString()
  roleLabel?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProposedDepartmentDto)
  proposedDepartment?: ProposedDepartmentDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProposedRoleDto)
  proposedRole?: ProposedRoleDto | null;

  @IsOptional()
  @IsString()
  docName?: string | null;
}

class IdentitySuggestionDto {
  @IsOptional()
  @ValidateIf((_, value) => value != null && value !== '')
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dateOfBirth must be ISO YYYY-MM-DD',
  })
  dateOfBirth?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value != null && value !== '')
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  passportNumber?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value != null && value !== '')
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'passportExpiry must be ISO YYYY-MM-DD',
  })
  passportExpiry?: string | null;

  @IsOptional()
  @IsBoolean()
  identityEdited?: boolean;
}

/**
 * Full replacement of the reviewer's edited profile suggestions for a bundle.
 */
export class UpdateBundleProfileSuggestionsDto {
  @ApiProperty({ type: [QualificationSuggestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QualificationSuggestionDto)
  qualifications!: QualificationSuggestionDto[];

  @ApiProperty({ type: [WorkExperienceSuggestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkExperienceSuggestionDto)
  workExperiences!: WorkExperienceSuggestionDto[];

  @ApiPropertyOptional({ type: ResumeRoleSuggestionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResumeRoleSuggestionDto)
  resumeRole?: ResumeRoleSuggestionDto | null;

  @ApiPropertyOptional({ type: IdentitySuggestionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => IdentitySuggestionDto)
  identity?: IdentitySuggestionDto | null;
}
