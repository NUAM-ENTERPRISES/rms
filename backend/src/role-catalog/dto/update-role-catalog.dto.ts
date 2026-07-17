import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

function optionalId({ value }: { value: unknown }): string | undefined | null {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t === '' ? null : t;
}

export class UpdateRoleCatalogDto {
  @ApiPropertyOptional({ example: 'emergency_staff_nurse' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Emergency Staff Nurse' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: 'Optional department id; null to clear' })
  @IsOptional()
  @Transform(optionalId)
  @IsString()
  roleDepartmentId?: string | null;

  @ApiPropertyOptional({
    description: 'Optional profession type id; null to clear',
  })
  @IsOptional()
  @Transform(optionalId)
  @IsString()
  professionTypeId?: string | null;

  @ApiPropertyOptional({ example: 'ER Nurse' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  shortName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
