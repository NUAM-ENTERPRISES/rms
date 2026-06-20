import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CheckLockerFileNumberQueryDto {
  @ApiProperty({ description: 'Locker file number to validate for uniqueness' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  lockerFileNumber: string;

  @ApiPropertyOptional({
    description:
      'Collection ID to exclude (when editing an existing locker assignment)',
  })
  @IsOptional()
  @IsString()
  excludeCollectionId?: string;
}
