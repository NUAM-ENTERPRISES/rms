import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class BulkTransferCandidateDto {
  @ApiProperty({
    description: 'List of candidate IDs to transfer',
    example: ['clh1234567890', 'clh0987654321'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  candidateIds: string[];

  @ApiProperty({
    description: 'ID of the recruiter to transfer the candidates to',
    example: 'clh1234567890',
  })
  @IsNotEmpty()
  @IsString()
  targetRecruiterId: string;

  @ApiProperty({
    description: 'Reason for transferring the candidates',
    example: 'Recruiter workload balancing',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
