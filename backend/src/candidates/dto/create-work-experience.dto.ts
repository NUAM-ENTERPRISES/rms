import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  IsJSON,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkExperienceDto {
  @ApiProperty({
    description: 'Candidate ID',
    example: 'cand_123abc',
  })
  @IsString()
  candidateId: string;

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
}
