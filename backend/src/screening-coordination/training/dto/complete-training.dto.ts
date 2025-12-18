import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CompleteTrainingDto {
  @ApiProperty({
    description: 'Notes about the completed training',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Improvement notes after training',
    required: false,
  })
  @IsOptional()
  @IsString()
  improvementNotes?: string;
}
