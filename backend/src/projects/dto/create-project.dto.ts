import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsJSON,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EducationRequirementDto } from './education-requirement.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleNeededDto {
  @ApiProperty({
    description: 'Job designation/title',
    example: 'Registered Nurse',
  })
  @IsString()
  designation: string;

  @ApiProperty({
    description: 'Number of positions needed',
    example: 5,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Priority level for this role',
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority?: string = 'medium';

  @ApiPropertyOptional({
    description: 'Minimum years of experience required',
    example: 2,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minExperience?: number;

  @ApiPropertyOptional({
    description: 'Maximum years of experience required',
    example: 10,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxExperience?: number;

  @ApiPropertyOptional({
    description: 'Specific experience areas required',
    example: '["ICU", "ER", "Leadership"]',
  })
  @IsOptional()
  @IsJSON()
  specificExperience?: string;

  @ApiPropertyOptional({
    description: 'Normalized education requirements with qualification IDs',
    type: [EducationRequirementDto],
  })
  @IsOptional()
  @Type(() => EducationRequirementDto)
  educationRequirementsList?: EducationRequirementDto[];

  @ApiPropertyOptional({
    description: 'Required certifications',
    example: '["RN", "BLS", "ACLS"]',
  })
  @IsOptional()
  @IsJSON()
  requiredCertifications?: string;

  @ApiPropertyOptional({
    description: 'Institution requirements',
    example: 'Accredited nursing program',
  })
  @IsOptional()
  @IsString()
  institutionRequirements?: string;

  @ApiPropertyOptional({
    description: 'Required skills as JSON array',
    example: '["Nursing", "Patient Care", "Medical Records"]',
  })
  @IsOptional()
  @IsJSON()
  skills?: string;

  @ApiPropertyOptional({
    description: 'Technical skills required',
    example: '["EPIC", "Ventilator Management"]',
  })
  @IsOptional()
  @IsJSON()
  technicalSkills?: string;

  @ApiPropertyOptional({
    description: 'Language requirements',
    example: '["English", "Spanish"]',
  })
  @IsOptional()
  @IsJSON()
  languageRequirements?: string;

  @ApiPropertyOptional({
    description: 'License requirements',
    example: '["State RN License", "Compact License"]',
  })
  @IsOptional()
  @IsJSON()
  licenseRequirements?: string;

  @ApiPropertyOptional({
    description: 'Background check required',
    default: true,
  })
  @IsOptional()
  backgroundCheckRequired?: boolean = true;

  @ApiPropertyOptional({
    description: 'Drug screening required',
    default: true,
  })
  @IsOptional()
  drugScreeningRequired?: boolean = true;

  @ApiPropertyOptional({
    description: 'Shift type required',
    enum: ['day', 'night', 'rotating', 'flexible'],
  })
  @IsOptional()
  @IsEnum(['day', 'night', 'rotating', 'flexible'])
  shiftType?: string;

  @ApiPropertyOptional({
    description: 'On-call required',
    default: false,
  })
  @IsOptional()
  onCallRequired?: boolean = false;

  @ApiPropertyOptional({
    description: 'Physical demands description',
    example: 'Must be able to lift 50 pounds and stand for 8 hours',
  })
  @IsOptional()
  @IsString()
  physicalDemands?: string;

  @ApiPropertyOptional({
    description: 'Salary range as JSON object',
    example: '{"min": 60000, "max": 80000, "currency": "USD"}',
  })
  @IsOptional()
  @IsJSON()
  salaryRange?: string;

  @ApiPropertyOptional({
    description: 'Benefits package description',
    example: 'Health insurance, 401k, paid time off',
  })
  @IsOptional()
  @IsString()
  benefits?: string;

  @ApiPropertyOptional({
    description: 'Relocation assistance available',
    default: false,
  })
  @IsOptional()
  relocationAssistance?: boolean = false;

  @ApiPropertyOptional({
    description: 'Additional requirements',
    example: 'Must be available for weekend shifts',
  })
  @IsOptional()
  @IsString()
  additionalRequirements?: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Preference for candidates with ICU experience',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Employment type for this role',
    enum: ['contract', 'permanent'],
    default: 'permanent',
  })
  @IsOptional()
  @IsEnum(['contract', 'permanent'])
  employmentType?: string = 'permanent';

  @ApiPropertyOptional({
    description:
      'Contract duration in years (only applicable for contract roles)',
    example: 2,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  contractDurationYears?: number;

  @ApiPropertyOptional({
    description: 'Gender requirement for this role',
    enum: ['female', 'male', 'all'],
    default: 'all',
  })
  @IsOptional()
  @IsEnum(['female', 'male', 'all'])
  genderRequirement?: string = 'all';
}

export class CreateProjectDto {
  @ApiPropertyOptional({
    description: 'Client ID for the project',
    example: 'client123',
  })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiProperty({
    description: 'Project title',
    example: 'Emergency Department Staffing',
    minLength: 2,
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Project description',
    example: 'Staffing for emergency department at City General Hospital',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Project deadline',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({
    description: 'Project status',
    enum: ['active', 'completed', 'cancelled'],
    default: 'active',
  })
  @IsOptional()
  @IsEnum(['active', 'completed', 'cancelled'])
  status?: string = 'active';

  @ApiPropertyOptional({
    description: 'Project priority level',
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority?: string = 'medium';

  @ApiPropertyOptional({
    description: 'Team ID assigned to the project',
    example: 'team123',
  })
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional({
    description: 'ISO-2 country code for the project location',
    example: 'US',
    minLength: 2,
    maxLength: 2,
  })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({
    description: 'Project type',
    enum: ['private', 'ministry'],
    default: 'private',
  })
  @IsOptional()
  @IsEnum(['private', 'ministry'])
  projectType?: string = 'private';

  @ApiPropertyOptional({
    description: 'Roles needed for this project',
    type: [CreateRoleNeededDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRoleNeededDto)
  rolesNeeded?: CreateRoleNeededDto[];
}
