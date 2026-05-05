import { IsOptional, IsString, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProcessingStepDto {
  @ApiPropertyOptional({ description: 'New status', example: 'completed' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Assigned user id', example: 'user_123' })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Eligibility issued date', example: '2026-04-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  eligibilityIssuedAt?: string;

  @ApiPropertyOptional({ description: 'Eligibility valid until date', example: '2027-04-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  eligibilityValidAt?: string;

  @ApiPropertyOptional({ description: 'Eligibility duration (e.g., 12 months)', example: '12 months' })
  @IsOptional()
  @IsString()
  eligibilityDuration?: string;

  @ApiPropertyOptional({ description: 'Eligibility number', example: 'EL-12345' })
  @IsOptional()
  @IsString()
  eligibilityNumber?: string;

  @ApiPropertyOptional({ description: 'Council issued date', example: '2026-04-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  councilIssuedAt?: string;

  @ApiPropertyOptional({ description: 'Council valid until date', example: '2027-04-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  councilValidAt?: string;

  @ApiPropertyOptional({ description: 'Biometric date', example: '2026-04-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  biometricDate?: string;

  @ApiPropertyOptional({ description: 'Biometric location', example: 'Mumbai Center' })
  @IsOptional()
  @IsString()
  biometricLocation?: string;

  @ApiPropertyOptional({ description: 'Visa issued date', example: '2026-04-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  visaIssuedAt?: string;

  @ApiPropertyOptional({ description: 'Visa expiry date', example: '2027-04-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  visaValidAt?: string;

  @ApiPropertyOptional({ description: 'Ticket date', example: '2026-04-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  ticketDate?: string;

  @ApiPropertyOptional({ description: 'Flight time', example: '2026-04-01T15:30:00Z' })
  @IsOptional()
  @IsDateString()
  flightTime?: string;

  @ApiPropertyOptional({ description: 'Airport location', example: 'London Heathrow' })
  @IsOptional()
  @IsString()
  airportLocation?: string;

  @ApiPropertyOptional({ description: 'Rejection reason', example: 'Incorrect document' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional({ description: 'Due date for the step', example: '2025-12-31T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Prometric / licensing exam pass date', example: '2026-05-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  prometricPassedAt?: string;

  @ApiPropertyOptional({ description: 'Prometric / licensing exam validity date', example: '2027-05-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  prometricValidAt?: string;

  @ApiPropertyOptional({ description: 'Medical issued date', example: '2026-05-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  medicalIssuedAt?: string;

  @ApiPropertyOptional({ description: 'Medical validity date', example: '2027-05-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  medicalValidAt?: string;

  @ApiPropertyOptional({ description: 'Mark emigration as completed manually', example: true })
  @IsOptional()
  @IsBoolean()
  isEmigrationCompleted?: boolean;
}