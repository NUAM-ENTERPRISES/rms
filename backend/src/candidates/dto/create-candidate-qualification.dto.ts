import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
  Max,
  MaxLength,
  IsNumber,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCandidateQualificationDto {
  @ApiProperty({
    description: 'Candidate ID',
    example: 'cand_123abc',
  })
  @IsString()
  candidateId: string;

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
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1950)
  @Max(2030)
  graduationYear?: number | null;

  @ApiPropertyOptional({
    description: 'GPA/Percentage',
    example: 3.8,
    minimum: 0,
    maximum: 4,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumber()
  @Min(0)
  @Max(4)
  gpa?: number | null;

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

  @ApiPropertyOptional({
    description:
      'Country where the qualification was obtained (`countries.code`).',
    example: 'IN',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(8)
  countryCode?: string | null;
}
