import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestResubmissionDto {
  @ApiProperty({
    description: 'Candidate Project Map ID',
    example: 'cpm_123abc',
  })
  @IsString()
  candidateProjectMapId: string;

  @ApiProperty({
    description: 'Reason for resubmission request',
    example: 'Document is unclear, please upload a higher quality scan',
  })
  @IsString()
  reason: string;
}
