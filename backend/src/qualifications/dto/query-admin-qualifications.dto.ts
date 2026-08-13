import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { QualificationLevel } from './query-qualifications.dto';

export class QueryAdminQualificationsDto {
  @ApiPropertyOptional({
    description: 'Search name, shortName, description, field, or alias',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  q?: string;

  @ApiPropertyOptional({ enum: QualificationLevel })
  @IsOptional()
  @IsEnum(QualificationLevel)
  level?: QualificationLevel;

  @ApiPropertyOptional({ example: 'Nursing' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  field?: string;
}
