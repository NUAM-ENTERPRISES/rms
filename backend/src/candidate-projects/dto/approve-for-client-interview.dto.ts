import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApproveForClientInterviewDto {
  @ApiProperty({
    description:
      'Optional notes for approving the candidate for client interview',
    example: 'Candidate has strong background, skipping mock interview',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
