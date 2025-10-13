import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class SendForVerificationDto {
  @ApiProperty({
    description: 'The ID of the candidate project mapping',
    example: 'clx0d0d0d0000000000000000',
  })
  @IsUUID()
  candidateProjectMapId: string;

  @ApiProperty({
    description: 'Optional notes for the verification request',
    example: 'Please verify all documents for this candidate.',
    required: false,
  })
  @IsString()
  notes?: string;
}
