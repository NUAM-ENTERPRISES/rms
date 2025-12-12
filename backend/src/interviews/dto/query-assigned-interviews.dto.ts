import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryAssignedInterviewsDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by candidate ID' })
  @IsOptional()
  @IsString()
  candidateId?: string;

  @ApiPropertyOptional({ description: 'Filter by recruiter/assignee ID' })
  @IsOptional()
  @IsString()
  recruiterId?: string;

  @ApiPropertyOptional({ description: 'Search term: candidate name, candidate email, project title, role designation' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Sub-status to filter by (defaults to 'interview_assigned')" })
  @IsOptional()
  @IsString()
  subStatus?: string;

  @ApiPropertyOptional({ description: 'Include already scheduled interviews (include sub-status interview_scheduled)', example: false })
  @IsOptional()
  @Type(() => Boolean)
  includeScheduled?: boolean = false;
}
