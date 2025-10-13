import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Country calling code',
    example: '+91',
  })
  @IsString({ message: 'Country code must be a string' })
  @Matches(/^\+[1-9]\d{0,3}$/, {
    message: 'Please provide a valid country code (e.g., +91, +1, +44)',
  })
  countryCode: string;

  @ApiProperty({
    description: 'Phone number without country code',
    example: '9876543210',
  })
  @IsString({ message: 'Phone number must be a string' })
  @Matches(/^\d{6,15}$/, {
    message: 'Please provide a valid phone number (6-15 digits)',
  })
  phone: string;

  @ApiProperty({
    description: 'User password',
    example: 'admin123',
    minLength: 1,
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(1, { message: 'Password is required' })
  password: string;
}
