import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TransferCandidateDto {
  @ApiProperty({
    description: 'ID of the recruiter to transfer the candidate to',
    example: 'clh1234567890',
  })
  @IsNotEmpty()
  @IsString()
  targetRecruiterId: string;

  @ApiProperty({
    description: 'Reason for transferring the candidate',
    example: 'Recruiter workload balancing',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
