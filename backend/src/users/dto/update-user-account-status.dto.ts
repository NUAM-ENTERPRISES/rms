import { IsEnum, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserAccountStatus } from '@prisma/client';

export class UpdateUserAccountStatusDto {
  @ApiProperty({
    enum: UserAccountStatus,
    example: UserAccountStatus.BLOCKED,
  })
  @IsEnum(UserAccountStatus, {
    message: 'Status must be ACTIVE, INACTIVE, or BLOCKED',
  })
  status: UserAccountStatus;

  @ApiProperty({
    description: 'Reason for the status change (required for active, inactive, and block)',
    example: 'Policy violation — section 4.2',
    minLength: 3,
    maxLength: 2000,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty({ message: 'Remarks are required' })
  @IsString({ message: 'Remarks must be a string' })
  @MinLength(3, { message: 'Remarks must be at least 3 characters' })
  @MaxLength(2000, { message: 'Remarks cannot exceed 2000 characters' })
  remarks: string;
}
