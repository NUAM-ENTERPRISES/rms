import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignCandidateDto {
  @ApiProperty({
    description: 'Candidate ID to assign to the project',
    example: 'candidate123',
  })
  @IsString()
  candidateId: string;

  @ApiPropertyOptional({
    description: 'Additional notes for the assignment',
    example: 'Assigned for emergency department role',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
