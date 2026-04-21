import { IsNotEmpty, IsString, IsStrongPassword, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: '+91' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+\d{1,4}$/)
  countryCode: string;

  @ApiProperty({ example: '9876543210' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{10,15}$/)
  mobileNumber: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  otp: string;

  @ApiProperty({ example: 'NewPassword123!' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  newPassword: string;
}
