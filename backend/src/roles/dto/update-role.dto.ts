import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UpdateRoleDto {
  @ApiPropertyOptional({
    description: 'Unique role name',
    example: 'Regional Recruiter Lead',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Role name must be a string' })
  @IsNotEmpty({ message: 'Role name is required' })
  @MaxLength(100, { message: 'Role name must be at most 100 characters' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Optional role description',
    example: 'Manages recruiters for a specific region',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Description must be a string' })
  @MaxLength(500, { message: 'Description must be at most 500 characters' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Permission keys from the existing catalog (wildcard * not allowed)',
    example: ['read:candidates', 'write:candidates'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'permissionKeys must be an array' })
  @ArrayNotEmpty({ message: 'At least one permission is required' })
  @IsString({ each: true, message: 'Each permission key must be a string' })
  permissionKeys?: string[];
}
