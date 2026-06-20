import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const STEP_REQUIREMENT_RULE_SCOPES = ['country', 'global'] as const;
export type StepRequirementRuleScope =
  (typeof STEP_REQUIREMENT_RULE_SCOPES)[number];

export class StepRequirementRulesQueryDto {
  @ApiProperty({
    description: 'Processing step template key',
    example: 'hrd',
  })
  @IsString()
  @IsNotEmpty()
  stepKey: string;
}

export class CreateStepRequirementRuleDto {
  @ApiProperty({
    description: 'Processing step template key',
    example: 'hrd',
  })
  @IsString()
  @IsNotEmpty()
  stepKey: string;

  @ApiProperty({
    description: 'Document type key',
    example: 'degree_certificate',
  })
  @IsString()
  @IsNotEmpty()
  docType: string;

  @ApiPropertyOptional({
    description: 'Whether this requirement is mandatory',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  mandatory?: boolean;

  @ApiPropertyOptional({
    description: 'Optional custom label',
    example: 'Degree Certificate',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @ApiPropertyOptional({
    description: 'Optional extra notes/instructions',
    example: 'Upload latest notarized scan',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description:
      'Rule scope: country (this candidate country only) or global (ALL countries)',
    enum: STEP_REQUIREMENT_RULE_SCOPES,
    example: 'country',
    default: 'country',
  })
  @IsOptional()
  @IsIn(STEP_REQUIREMENT_RULE_SCOPES)
  scope?: StepRequirementRuleScope;
}

export class UpdateStepRequirementRuleDto {
  @ApiProperty({
    description: 'Processing step template key',
    example: 'hrd',
  })
  @IsString()
  @IsNotEmpty()
  stepKey: string;

  @ApiPropertyOptional({
    description: 'Whether this requirement is mandatory',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  mandatory?: boolean;

  @ApiPropertyOptional({
    description: 'Optional custom label',
    example: 'Degree Certificate',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @ApiPropertyOptional({
    description: 'Optional extra notes/instructions',
    example: 'Optional for this country',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
