import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

function optionalId({ value }: { value: unknown }): string | undefined | null {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t === '' ? null : t;
}

export class CreateRoleCatalogDto {
  @ApiProperty({ example: 'emergency_staff_nurse' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'Emergency Staff Nurse' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiPropertyOptional({
    description: 'Optional department id',
    example: 'rd_123',
  })
  @IsOptional()
  @Transform(optionalId)
  @IsString()
  roleDepartmentId?: string | null;

  @ApiPropertyOptional({
    description: 'Optional profession type id',
    example: 'pt_nurse_seed001',
  })
  @IsOptional()
  @Transform(optionalId)
  @IsString()
  professionTypeId?: string | null;

  @ApiPropertyOptional({ example: 'ER Nurse' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  shortName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
