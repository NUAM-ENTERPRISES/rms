import { IsOptional, IsInt, Min, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CANDIDATE_STATUS, CandidateStatus } from '../../common/constants/statuses';

export class GetRecruiterCandidatesDto {
  @ApiPropertyOptional({
    description: 'Page number (starts from 1)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by candidate status',
    enum: CANDIDATE_STATUS,
    example: CANDIDATE_STATUS.INTERESTED,
  })
  @IsOptional()
  @IsEnum(CANDIDATE_STATUS)
  status?: CandidateStatus;

  @ApiPropertyOptional({
    description: 'Search by candidate name, email, or mobile number',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
