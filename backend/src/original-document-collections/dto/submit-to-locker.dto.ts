import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SubmitToLockerDto {
  @ApiProperty({ description: 'Physical locker file reference number' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lockerFileNumber: string;
}
