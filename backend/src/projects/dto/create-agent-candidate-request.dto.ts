import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAgentCandidateRequestItemDto {
  @ApiProperty({
    description: 'Role requirement id from project rolesNeeded',
    example: 'cm_role_needed_123',
  })
  @IsString()
  roleNeededId: string;

  @ApiProperty({
    description: 'Requested candidate count for this role',
    example: 2,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  requestedCount: number;
}

export class CreateAgentCandidateRequestDto {
  @ApiProperty({
    type: [CreateAgentCandidateRequestItemDto],
    description: 'Role-wise requested candidate counts',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateAgentCandidateRequestItemDto)
  items: CreateAgentCandidateRequestItemDto[];

  @ApiPropertyOptional({
    description: 'Optional context for coordinator',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
