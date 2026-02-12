import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn, IsArray, ArrayMinSize } from 'class-validator';

export class BulkSendForInterviewDto {
  @ApiProperty({ description: 'Project ID', example: 'proj_abc' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({
    description: 'Array of Candidate IDs',
    example: ['cand_xyz', 'cand_123'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  candidateIds: string[];

  @ApiProperty({
    description:
      "Either 'screening_assigned', 'interview_assigned' or 'training_assigned'",
    example: 'interview_assigned',
  })
  @IsString()
  @IsIn(['screening_assigned', 'interview_assigned', 'training_assigned'])
  type: 'screening_assigned' | 'interview_assigned' | 'training_assigned';

  @ApiProperty({ description: 'Optional recruiter id to assign', required: false })
  @IsOptional()
  @IsString()
  recruiterId?: string;

  @ApiProperty({ description: 'Optional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
