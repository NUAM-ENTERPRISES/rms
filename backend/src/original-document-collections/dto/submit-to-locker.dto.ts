import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SubmitToLockerDto {
  @ApiProperty({ description: 'Physical locker file reference number' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  lockerFileNumber: string;
}
