import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NominateCandidateDto {
  @ApiProperty({
    description: 'Project ID to nominate candidate for',
    example: 'proj_123abc',
  })
  @IsString()
  projectId: string;

  @ApiPropertyOptional({
    description: 'Nomination notes',
    example: 'Candidate meets all requirements for this project',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
