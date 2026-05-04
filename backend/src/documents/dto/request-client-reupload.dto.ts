import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestClientReuploadDto {
  @ApiProperty({
    description: 'Candidate Project Map ID',
    example: 'cpm_123abc',
  })
  @IsString()
  @IsNotEmpty()
  candidateProjectMapId: string;

  @ApiProperty({
    description: 'Reason describing the client feedback/revision request',
    example: 'Client requested a clearer resume or corrected spelling.',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
