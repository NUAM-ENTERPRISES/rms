import { IsString, IsOptional, IsInt, Min, Max, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RunAllocationDto {
  @ApiProperty({
    description: 'Project ID to allocate candidates for',
    example: 'proj_123abc',
  })
  @IsString()
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({
    description:
      'Specific role needed ID to allocate for (if not provided, allocates for all roles)',
    example: 'role_456def',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  roleNeededId?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of candidates to process in this batch',
    example: 100,
    minimum: 1,
    maximum: 1000,
    default: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  batchSize?: number = 100;
}
