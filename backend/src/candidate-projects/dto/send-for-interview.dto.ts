import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class SendForInterviewDto {
  @ApiProperty({ description: 'Project ID', example: 'proj_abc' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ description: 'Candidate ID', example: 'cand_xyz' })
  @IsString()
  @IsNotEmpty()
  candidateId: string;

  @ApiProperty({
    description: "Either 'mock_interview_assigned' or 'interview_assigned'",
    example: 'interview_assigned',
  })
  @IsString()
  @IsIn(['mock_interview_assigned', 'interview_assigned'])
  type: 'mock_interview_assigned' | 'interview_assigned';

  @ApiProperty({ description: 'Optional recruiter id to assign', required: false })
  @IsOptional()
  @IsString()
  recruiterId?: string;

  @ApiProperty({ description: 'Optional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
