import {
  IsString,
  IsOptional,
  IsEmail,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsJSON,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
    description: 'Current status of the candidate',
    enum: ['new', 'shortlisted', 'selected', 'rejected', 'hired'],
    default: 'new',
  })
  @IsOptional()
  @IsEnum(['new', 'shortlisted', 'selected', 'rejected', 'hired'])
  currentStatus?: string = 'new';

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
  @IsInt()
  @Min(0)
  @Max(4)
  gpa?: number;

  @ApiPropertyOptional({
    description: 'Team ID for team scoping',
    example: 'team123',
  })
  @IsOptional()
  @IsString()
  teamId?: string;
}
