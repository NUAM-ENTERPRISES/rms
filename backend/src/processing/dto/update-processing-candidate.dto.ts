import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateProcessingCandidateDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'File number for the candidate (manual entry)', example: 'PC-2024-001' })
  fileNumber?: string;
}
