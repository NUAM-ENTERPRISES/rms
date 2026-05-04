import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';

export class AgentProjectLinkItemDto {
  @ApiProperty({ description: 'Project ID to link to this agent' })
  @IsString()
  projectId!: string;

  @ApiPropertyOptional({ description: 'Optional notes for this engagement' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class LinkAgentProjectsDto {
  @ApiProperty({ type: [AgentProjectLinkItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AgentProjectLinkItemDto)
  links!: AgentProjectLinkItemDto[];
}
