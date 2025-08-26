import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignProjectDto {
  @ApiProperty({
    description: 'Project ID to assign the candidate to',
    example: 'project123',
  })
  @IsString()
  projectId: string;

  @ApiPropertyOptional({
    description: 'Additional notes for the assignment',
    example: 'Assigned for emergency department role',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
