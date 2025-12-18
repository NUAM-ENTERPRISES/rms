import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class AssignToMainInterviewDto {
  @ApiProperty({ description: 'Project ID', example: 'proj_abc' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ description: 'Candidate ID', example: 'cand_xyz' })
  @IsString()
  @IsNotEmpty()
  candidateId: string;


  @ApiProperty({ description: 'Optional recruiter id to assign', required: false })
  @IsOptional()
  @IsString()
  recruiterId?: string;

  @ApiProperty({ description: 'Optional screening ID to specifically update', required: false })
  @IsOptional()
  @IsString()
  screeningId?: string;

  @ApiProperty({ description: 'Optional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
