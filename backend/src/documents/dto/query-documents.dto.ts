import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DOCUMENT_STATUS } from '../../common/constants';

export class QueryDocumentsDto {
  @ApiPropertyOptional({
    description: 'Filter by candidate ID',
    example: 'cand_123abc',
  })
  @IsOptional()
  @IsString()
  candidateId?: string;

  @ApiPropertyOptional({
    description: 'Filter by document type',
    example: 'passport',
  })
  @IsOptional()
  @IsString()
  docType?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: Object.values(DOCUMENT_STATUS),
    example: DOCUMENT_STATUS.PENDING,
  })
  @IsOptional()
  @IsEnum(Object.values(DOCUMENT_STATUS))
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by uploader user ID',
    example: 'user_123abc',
  })
  @IsOptional()
  @IsString()
  uploadedBy?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Search term (file name, document number)',
    example: 'passport',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
