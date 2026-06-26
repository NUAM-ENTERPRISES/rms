import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { AGENT_TYPES } from '../constants/agent-types';
import { AgentProjectLinkItemDto } from './link-agent-projects.dto';

/** Empty / whitespace-only strings become undefined so @IsOptional() skips other validators. */
function optionalString({ value }: { value: unknown }): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t === '' ? undefined : t;
}

export class CreateAgentDto {
  @ApiProperty({ description: 'Agent name (required)' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Agent name is required' })
  name!: string;

  @ApiPropertyOptional({ description: 'Agent email' })
  @Transform(optionalString)
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Agent mobile number' })
  @Transform(optionalString)
  @IsOptional()
  @IsString()
  mobileNumber?: string;

  @ApiPropertyOptional({ description: 'Agent WhatsApp number' })
  @Transform(optionalString)
  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @ApiPropertyOptional({ description: 'Agent alternate phone 1' })
  @Transform(optionalString)
  @IsOptional()
  @IsString()
  alternatePhone1?: string;

  @ApiPropertyOptional({ description: 'Agent alternate phone 2' })
  @Transform(optionalString)
  @IsOptional()
  @IsString()
  alternatePhone2?: string;

  @ApiPropertyOptional({ description: 'Agent country code (ISO)' })
  @Transform(optionalString)
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ description: 'Agent company name' })
  @Transform(optionalString)
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ description: 'Agent location (city, region, or address)' })
  @Transform(optionalString)
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Agent type', enum: AGENT_TYPES })
  @Transform(optionalString)
  @IsOptional()
  @IsString()
  agentType?: string;

  @ApiPropertyOptional({ description: 'Agent profile image URL' })
  @Transform(optionalString)
  @IsOptional()
  @IsString()
  profileImage?: string;

  @ApiPropertyOptional({ description: 'Whether the agent is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: [AgentProjectLinkItemDto],
    description:
      'Optional active projects to link immediately after the agent is created',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgentProjectLinkItemDto)
  projectLinks?: AgentProjectLinkItemDto[];
}
