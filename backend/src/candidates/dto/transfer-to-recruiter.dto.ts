import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransferToRecruiterDto {
  @ApiProperty({
    description: 'Status the candidate should have after reassignment to recruiter',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  currentStatusId: number;

  @ApiProperty({
    description: 'Operations status note for the recruiter (required)',
    example: 'Operations completed follow-up; candidate interested in UAE role',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({
    description: 'On-hold duration in days when status is On Hold',
    example: 14,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  onHoldDurationDays?: number;

  @ApiPropertyOptional({
    description: 'On-hold until date when status is On Hold',
    example: '2026-06-01',
  })
  @IsOptional()
  @IsDateString()
  onHoldUntil?: string;

  @ApiPropertyOptional({
    description: 'Future availability date when status is Future',
    example: '2026-09-01',
  })
  @IsOptional()
  @IsDateString()
  futureDate?: string;

  @ApiPropertyOptional({
    description:
      'Contact note from the interested call (stored on operations_call_logs)',
    example: 'Candidate answered and is interested in the UAE role.',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  operationsCallNote?: string;

  @ApiPropertyOptional({
    description: 'Phone used during the interested call log',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  usedPhone?: boolean;

  @ApiPropertyOptional({
    description: 'WhatsApp used during the interested call log',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  usedWhatsapp?: boolean;
}
