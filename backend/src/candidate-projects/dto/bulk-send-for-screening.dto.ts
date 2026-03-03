import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkSendForScreeningItemDto {
  @ApiProperty({ description: 'Candidate ID' })
  @IsString()
  @IsNotEmpty()
  candidateId: string;

  @ApiProperty({ description: 'Role needed ID (must belong to the project)' })
  @IsString()
  @IsNotEmpty()
  roleNeededId: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Coordinator ID for this candidate (overrides global if set)' })
  @IsString()
  @IsOptional()
  coordinatorId?: string;
}

export class BulkSendForScreeningDto {
  @ApiProperty({ description: 'Project ID' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ description: 'List of candidate assignments' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkSendForScreeningItemDto)
  assignments: BulkSendForScreeningItemDto[];

  @ApiPropertyOptional({ description: 'Global coordinator ID for all candidates' })
  @IsString()
  @IsOptional()
  coordinatorId?: string;
}
