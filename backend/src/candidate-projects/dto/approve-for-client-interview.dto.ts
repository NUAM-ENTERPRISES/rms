import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApproveForClientInterviewDto {
  @ApiProperty({
    description:
      'Optional notes for approving the candidate for client interview',
    example: 'Candidate has strong background, skipping screening interview',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
