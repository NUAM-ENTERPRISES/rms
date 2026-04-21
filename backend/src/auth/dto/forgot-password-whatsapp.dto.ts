import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordWhatsappDto {
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
}
