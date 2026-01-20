import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CompleteProcessingDto {
  @ApiPropertyOptional({ description: 'Optional notes to store in processing / candidate history' })
  @IsOptional()
  @IsString()
  notes?: string;
}
