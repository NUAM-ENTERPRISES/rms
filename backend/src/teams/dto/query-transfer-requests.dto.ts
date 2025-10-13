import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryTransferRequestsDto {
  @ApiPropertyOptional({
    description: 'Filter by transfer request status',
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    example: 'pending',
  })
  @IsOptional()
  @IsString()
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';

  @ApiPropertyOptional({
    description: 'Number of transfer requests to return',
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Number of records to skip',
    minimum: 0,
    default: 0,
    example: 0,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
