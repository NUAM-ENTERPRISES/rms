import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { QualificationLevel } from './query-qualifications.dto';

export class QualificationAliasInputDto {
  @ApiProperty({ example: 'RN' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  alias!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCommon?: boolean;
}

export class CreateQualificationDto {
  @ApiProperty({ example: 'Bachelor of Science in Nursing (BSc Nursing)' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'BSc Nursing' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  shortName?: string;

  @ApiProperty({ enum: QualificationLevel, example: QualificationLevel.BACHELOR })
  @IsEnum(QualificationLevel)
  level!: QualificationLevel;

  @ApiProperty({ example: 'Nursing' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  field!: string;

  @ApiPropertyOptional({ example: 'Bachelor of Science' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  program?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [QualificationAliasInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QualificationAliasInputDto)
  aliases?: QualificationAliasInputDto[];
}
