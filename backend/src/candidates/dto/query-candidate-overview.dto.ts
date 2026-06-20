import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { QueryCandidatesDto } from './query-candidates.dto';

export { DateFilterType } from './query-candidates.dto';

export class QueryCandidateOverviewDto extends QueryCandidatesDto {
  @ApiPropertyOptional({
    description: 'Filter by recruiter ID (Admin only)',
  })
  @IsOptional()
  @IsString()
  recruiterId?: string;

  @ApiPropertyOptional({
    description: 'Filter by project main status name',
  })
  @IsOptional()
  @IsString()
  mainStatus?: string;

  @ApiPropertyOptional({
    description: 'Filter by project sub-status name',
  })
  @IsOptional()
  @IsString()
  subStatus?: string;

  @ApiPropertyOptional({
    description: 'Filter by specific processing step key',
  })
  @IsOptional()
  @IsString()
  processingStep?: string;
}
