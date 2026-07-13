import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitToLockerDto {
  @ApiPropertyOptional({
    description: 'Physical locker file reference number (optional)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }
    const normalized = value.trim().toUpperCase();
    return normalized === '' ? undefined : normalized;
  })
  lockerFileNumber?: string;
}
