import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateCandidateProjectDto {
  @ApiPropertyOptional({ description: 'Role needed ID' })
  @IsString()
  @IsOptional()
  roleNeededId?: string;

  @ApiPropertyOptional({ description: 'Recruiter ID' })
  @IsString()
  @IsOptional()
  recruiterId?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
