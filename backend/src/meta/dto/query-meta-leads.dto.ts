import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { MetaLeadStatus } from '@prisma/client';

export class QueryMetaLeadsDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: MetaLeadStatus,
    description: 'Filter by MetaLead status',
  })
  @IsOptional()
  @IsEnum(MetaLeadStatus)
  status?: MetaLeadStatus;

  @ApiPropertyOptional({
    example: 'whatsapp',
    description:
      'Filter by platform (meta, instagram, messenger/facebook, whatsapp)',
  })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({
    example: 'jane',
    description: 'Search name, email, phone, leadId, or shortCode',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
