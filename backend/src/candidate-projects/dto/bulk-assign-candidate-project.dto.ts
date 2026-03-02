import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsString, ValidateNested, IsOptional } from 'class-validator';

export class CandidateAssignmentDto {
  @ApiProperty({ description: 'Candidate ID' })
  @IsString()
  @IsNotEmpty()
  candidateId: string;

  @ApiProperty({ description: 'Role needed ID' })
  @IsString()
  @IsNotEmpty()
  roleNeededId: string;

  @ApiPropertyOptional({ description: 'Optional notes for this specific assignment' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class BulkAssignCandidateProjectDto {
  @ApiProperty({ description: 'Project ID' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({
    description: 'Array of candidate assignments',
    type: [CandidateAssignmentDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateAssignmentDto)
  assignments: CandidateAssignmentDto[];
}
