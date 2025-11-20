import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCandidateProjectDto {
  @ApiProperty({ description: 'Candidate ID' })
  @IsString()
  @IsNotEmpty()
  candidateId: string;

  @ApiProperty({ description: 'Project ID' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiPropertyOptional({ description: 'Role needed ID (must belong to the specified project)' })
  @IsString()
  @IsOptional()
  roleNeededId?: string;

  @ApiPropertyOptional({ description: 'Recruiter ID (user must have Recruiter role)' })
  @IsString()
  @IsOptional()
  recruiterId?: string;

  @ApiPropertyOptional({ description: 'Additional notes for the assignment' })
  @IsString()
  @IsOptional()
  notes?: string;
}
