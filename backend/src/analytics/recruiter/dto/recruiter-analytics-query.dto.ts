import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RecruiterAnalyticsQueryDto {
  @ApiProperty({
    description: 'Recruiter user ID',
    example: 'clxyz123abc',
  })
  @IsString()
  recruiterId: string;

  @ApiPropertyOptional({
    description: 'Year to filter by (defaults to current year)',
    example: '2026',
  })
  @IsOptional()
  @IsString()
  year?: string;
}
