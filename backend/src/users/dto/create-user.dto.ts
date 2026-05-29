import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsDateString,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiPropertyOptional({
    description: 'Employee code (must be unique)',
    example: 'AFFEMP012026',
  })
  @IsOptional()
  @IsString({ message: 'Employee code must be a string' })
  @Matches(/^AFFEMP\d{2}\d{4}$/, {
    message: 'Employee code must match format AFFEMP01YYYY (e.g., AFFEMP012026)',
  })
  employeeCode?: string;

  @ApiProperty({
    description: 'User email address (must be unique)',
    example: 'john.doe@affiniks.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  name: string;

  @ApiProperty({
    description:
      'User password (minimum 8 characters, must include uppercase, lowercase, number, and special character)',
    example: 'SecurePass123!',
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;

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
    description:
      'Mobile number without country code (must be unique with country code)',
    example: '9876543210',
  })
  @IsString({ message: 'Mobile number must be a string' })
  @Matches(/^\d{6,15}$/, {
    message: 'Please provide a valid mobile number (6-15 digits)',
  })
  mobileNumber: string;

  @ApiPropertyOptional({
    description: 'User date of birth (ISO date string)',
    example: '1990-01-01',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Date of birth must be a valid date' })
  dateOfBirth?: string;

  @ApiPropertyOptional({
    description:
      'Profile image URL (uploaded via /api/v1/upload/profile-image)',
    example: 'https://cdn.example.com/users/profiles/user123/image.jpg',
  })
  @IsOptional()
  @IsString({ message: 'Profile image must be a string URL' })
  profileImage?: string;

  @ApiPropertyOptional({
    description:
      'Physical / mailing country (`countries.code`). Distinct from phone `countryCode` (dial code).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  addressCountryCode?: string;

  @ApiPropertyOptional({
    description: 'Physical / mailing state (`states.id`)',
  })
  @IsOptional()
  @IsString()
  addressStateId?: string;

  @ApiPropertyOptional({
    description: 'Street or full mailing address line',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({
    description: 'User location (City, Country)',
    example: 'New York, USA',
  })
  @IsOptional()
  @IsString({ message: 'Location must be a string' })
  location?: string;

  @ApiPropertyOptional({
    description: 'User timezone',
    example: 'America/New_York',
  })
  @IsOptional()
  @IsString({ message: 'Timezone must be a string' })
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Array of role IDs to assign to the user',
    example: ['role123', 'role456'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Role IDs must be an array' })
  @IsString({ each: true, message: 'Each role ID must be a valid string' })
  roleIds?: string[];
}
