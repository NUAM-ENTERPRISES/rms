import { ApiProperty } from '@nestjs/swagger';

export class CareerGapDto {
  @ApiProperty({
    enum: ['between_jobs', 'education_to_work', 'current_unemployment'],
    example: 'between_jobs',
  })
  type: 'between_jobs' | 'education_to_work' | 'current_unemployment';

  @ApiProperty({ example: '2025-01-01' })
  startDate: string;

  @ApiProperty({ example: '2026-01-01' })
  endDate: string;

  @ApiProperty({ example: 12 })
  months: number;

  @ApiProperty({ example: 'Between Aster Hospital and City Clinic' })
  label: string;
}

export class CareerGapAnalysisDto {
  @ApiProperty({ example: 24 })
  totalExperienceMonths: number;

  @ApiProperty({ example: 12 })
  totalGapMonths: number;

  @ApiProperty({ example: 12 })
  longestGapMonths: number;

  @ApiProperty({ example: false })
  hasCurrentEmployment: boolean;

  @ApiProperty({ type: [CareerGapDto] })
  gaps: CareerGapDto[];
}
