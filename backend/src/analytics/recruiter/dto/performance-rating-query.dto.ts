import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PerformanceRatingQueryDto {
  @ApiPropertyOptional({
    description: 'Recruiter user ID (managers/admins only; recruiters use own id)',
    example: 'clxyz123abc',
  })
  @IsOptional()
  @IsString()
  recruiterId?: string;

  @ApiPropertyOptional({
    description: 'Calendar year (defaults to current year)',
    example: 2026,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({
    description: 'Calendar month 1–12 for monthly block (defaults to current month)',
    example: 6,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}
