import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryNotificationsDto {
  @ApiPropertyOptional({
    description: 'Filter by notification status',
    enum: ['unread', 'read'],
    example: 'unread',
  })
  @IsOptional()
  @IsString()
  status?: 'unread' | 'read';

  @ApiPropertyOptional({
    description: 'Filter by notification type',
    example: 'transfer_request',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Number of notifications to return',
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
    description: 'Cursor for pagination (notification ID)',
    example: 'clx1234567890',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}
