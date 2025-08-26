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
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCandidateDto {
  @ApiProperty({
    description: 'Candidate full name',
    example: 'John Doe',
    minLength: 2,
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Contact number (unique)',
    example: '+1234567890',
  })
  @IsString()
  contact: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'john.doe@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Source of the candidate',
    enum: ['manual', 'meta', 'referral'],
    default: 'manual',
  })
  @IsOptional()
  @IsEnum(['manual', 'meta', 'referral'])
  source?: string = 'manual';

  @ApiPropertyOptional({
    description: 'Date of birth',
    example: '1990-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    description: 'Current status of the candidate',
    enum: ['new', 'shortlisted', 'selected', 'rejected', 'hired'],
    default: 'new',
  })
  @IsOptional()
  @IsEnum(['new', 'shortlisted', 'selected', 'rejected', 'hired'])
  currentStatus?: string = 'new';

  @ApiPropertyOptional({
    description: 'Years of experience',
    example: 5,
    minimum: 0,
    maximum: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  experience?: number;

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
    description: 'Expected salary in currency units',
    example: 50000,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  expectedSalary?: number;

  @ApiPropertyOptional({
    description: 'Team ID for team scoping',
    example: 'team123',
  })
  @IsOptional()
  @IsString()
  teamId?: string;
}
