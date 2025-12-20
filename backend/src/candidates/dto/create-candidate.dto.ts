import {
  IsString,
  IsOptional,
  IsEmail,
  IsDateString,
  IsInt,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsJSON,
  Matches,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateWorkExperienceDto } from './create-work-experience.dto';

export class CreateCandidateDto {
  @ApiProperty({
    description: 'Candidate first name',
    example: 'John',
    minLength: 2,
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'Candidate last name',
    example: 'Doe',
    minLength: 2,
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'Country calling code',
    example: '+91',
  })
  @IsString()
  @Matches(/^\+[1-9]\d{0,3}$/, {
    message: 'Please provide a valid country code (e.g., +91, +1, +44)',
  })
  countryCode: string;

  @ApiProperty({
    description:
      'Mobile number without country code (must be unique with country code)',
    example: '9876543210',
  })
  @IsString()
  @Matches(/^\d{6,15}$/, {
    message: 'Please provide a valid mobile number (6-15 digits)',
  })
  mobileNumber: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'john.doe@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description:
      'Profile image URL (uploaded via /api/v1/upload/profile-image)',
    example:
      'https://cdn.example.com/candidates/profiles/candidate123/image.jpg',
  })
  @IsOptional()
  @IsString()
  profileImage?: string;

  @ApiPropertyOptional({
    description: 'Source of the candidate',
    enum: ['manual', 'meta', 'referral'],
    default: 'manual',
  })
  @IsOptional()
  @IsEnum(['manual', 'meta', 'referral'])
  source?: string = 'manual';

  @ApiProperty({
    description: 'Date of birth (mandatory)',
    example: '1990-01-01T00:00:00.000Z',
  })
  @IsDateString()
  dateOfBirth: string;

  @ApiPropertyOptional({
    description: 'Candidate current status ID (from candidate_status table)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  currentStatusId?: number;

  @ApiPropertyOptional({
    description: 'Total years of experience',
    example: 5,
    minimum: 0,
    maximum: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  totalExperience?: number;

  @ApiPropertyOptional({
    description: 'Current salary',
    example: 45000,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  currentSalary?: number;

  @ApiPropertyOptional({
    description: 'Skills as JSON array',
    example: '["Nursing", "Patient Care", "Medical Records"]',
  })
  @IsOptional()
  @IsJSON()
  skills?: string;

  @ApiPropertyOptional({
    description: 'Current employer',
    example: 'City General Hospital',
  })
  @IsOptional()
  @IsString()
  currentEmployer?: string;

  @ApiPropertyOptional({
    description: 'Current job title/role',
    example: 'Senior Nurse',
  })
  @IsOptional()
  @IsString()
  currentRole?: string;

  @ApiPropertyOptional({
    description: 'Expected salary in currency units',
    example: 50000,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  expectedSalary?: number;

  // Educational Qualifications
  @ApiPropertyOptional({
    description: 'Highest education level',
    example: 'BSc Nursing',
  })
  @IsOptional()
  @IsString()
  highestEducation?: string;

  @ApiPropertyOptional({
    description: 'University/Institution name',
    example: 'University of Health Sciences',
  })
  @IsOptional()
  @IsString()
  university?: string;

  @ApiPropertyOptional({
    description: 'Graduation year',
    example: 2018,
    minimum: 1950,
    maximum: 2030,
  })
  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2030)
  graduationYear?: number;

  @ApiPropertyOptional({
    description: 'GPA/Percentage',
    example: 3.8,
    minimum: 0,
    maximum: 4,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(4)
  gpa?: number;

  // Multiple Educational Qualifications
  @ApiPropertyOptional({
    description: 'Educational qualifications array',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        qualificationId: { type: 'string', example: 'qual123' },
        university: {
          type: 'string',
          example: 'University of Health Sciences',
        },
        graduationYear: { type: 'number', example: 2018 },
        gpa: { type: 'number', example: 3.8 },
        isCompleted: { type: 'boolean', example: true },
        notes: { type: 'string', example: 'Graduated with honors' },
      },
    },
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateQualificationDto)
  qualifications?: CandidateQualificationDto[];

  @ApiPropertyOptional({
    description: 'Team ID for team scoping',
    example: 'team123',
  })
  @IsOptional()
  @IsString()
  teamId?: string;

  // Work Experiences (for candidate creation)
  @ApiPropertyOptional({
    description: 'Work experiences to create with the candidate',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        companyName: { type: 'string', example: 'City General Hospital' },
        jobTitle: { type: 'string', example: 'Senior Nurse' },
        startDate: { type: 'string', example: '2020-01-15T00:00:00.000Z' },
        endDate: { type: 'string', example: '2023-12-31T00:00:00.000Z' },
        isCurrent: { type: 'boolean', example: false },
        description: { type: 'string', example: 'Provided patient care' },
        salary: { type: 'number', example: 45000 },
        location: { type: 'string', example: 'New York, NY' },
        skills: {
          type: 'string',
          example: '["Patient Care", "Medical Records"]',
        },
        achievements: { type: 'string', example: 'Led team of 5 nurses' },
      },
    },
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateWorkExperienceDto)
  workExperiences?: CandidateWorkExperienceDto[];
}

export class CandidateQualificationDto {
  @ApiProperty({
    description: 'Qualification ID from the qualifications catalog',
    example: 'qual123',
  })
  @IsString()
  qualificationId: string;

  @ApiPropertyOptional({
    description: 'University/Institution name',
    example: 'University of Health Sciences',
  })
  @IsOptional()
  @IsString()
  university?: string;

  @ApiPropertyOptional({
    description: 'Graduation year',
    example: 2018,
    minimum: 1950,
    maximum: 2030,
  })
  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2030)
  graduationYear?: number;

  @ApiPropertyOptional({
    description: 'GPA/Percentage',
    example: 3.8,
    minimum: 0,
    maximum: 4,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(4)
  gpa?: number;

  @ApiPropertyOptional({
    description: 'Whether the qualification is completed',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean = true;

  @ApiPropertyOptional({
    description: 'Additional notes about the qualification',
    example: 'Graduated with honors',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

// DTO for work experiences during candidate creation (no candidateId needed)
export class CandidateWorkExperienceDto {
  @ApiProperty({
    description: 'Company name',
    example: 'City General Hospital',
    minLength: 2,
  })
  @IsString()
  companyName: string;

  @ApiProperty({
    description: 'Job title/position',
    example: 'Senior Nurse',
    minLength: 2,
  })
  @IsString()
  jobTitle: string;

  @ApiProperty({
    description: 'Start date of employment',
    example: '2020-01-15T00:00:00.000Z',
  })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({
    description: 'End date of employment (leave empty if current)',
    example: '2023-12-31T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Is this the current job',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean = false;

  @ApiPropertyOptional({
    description: 'Job description',
    example: 'Provided patient care and managed medical records',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Salary at this position',
    example: 45000,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  salary?: number;

  @ApiPropertyOptional({
    description: 'Work location',
    example: 'New York, NY',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Skills gained/used in this role as JSON array',
    example: '["Patient Care", "Medical Records", "Team Leadership"]',
  })
  @IsOptional()
  @IsJSON()
  skills?: string;

  @ApiPropertyOptional({
    description: 'Key achievements in this role',
    example: 'Led team of 5 nurses, improved patient satisfaction by 20%',
  })
  @IsOptional()
  @IsString()
  achievements?: string;

  @ApiPropertyOptional({
    description: 'Role catalog ID for this work experience (optional)',
    example: 'rolecat_123abc',
  })
  @IsOptional()
  @IsString()
  roleCatalogId?: string;
}
