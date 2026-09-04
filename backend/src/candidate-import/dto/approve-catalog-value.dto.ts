import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const TARGETS = [
  'qualification',
  'qualification_alias',
  'role_department',
  'role_catalog',
] as const;

const LEVELS = [
  'CERTIFICATE',
  'DIPLOMA',
  'BACHELOR',
  'MASTER',
  'DOCTORATE',
] as const;

/**
 * Creates a catalog row or alias that a reviewer explicitly approved.
 *
 * Adding an alias to an existing qualification is almost always the right call;
 * creating a brand-new qualification needs a level and field precisely because
 * that friction discourages duplicates.
 */
export class ApproveCatalogValueDto {
  @ApiProperty({ enum: TARGETS })
  @IsIn(TARGETS)
  target!: (typeof TARGETS)[number];

  @ApiProperty({ description: 'Canonical name, or the alias text.' })
  @IsString()
  @MaxLength(200)
  value!: string;

  @ApiPropertyOptional({
    description: 'Qualification this alias belongs to. Required for aliases.',
  })
  @IsOptional()
  @IsString()
  qualificationId?: string;

  @ApiPropertyOptional({
    enum: LEVELS,
    description: 'Required when creating a qualification.',
  })
  @IsOptional()
  @IsIn(LEVELS)
  level?: (typeof LEVELS)[number];

  @ApiPropertyOptional({
    description: 'Broad discipline. Required when creating a qualification.',
    example: 'Nursing',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  field?: string;

  @ApiPropertyOptional({ description: 'Required when creating a role.' })
  @IsOptional()
  @IsString()
  roleDepartmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  professionTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  shortName?: string;
}
