import { IsString, IsOptional, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiPropertyOptional({
    description: 'Current password for verification (required for self-change, optional for admin reset)',
    example: 'CurrentPass123!',
  })
  @IsOptional()
  @IsString({ message: 'Current password must be a string' })
  currentPassword?: string;

  @ApiProperty({
    description:
      'New password (minimum 8 characters, must include uppercase, lowercase, number, and special character)',
    example: 'NewSecurePass123!',
    minLength: 8,
  })
  @IsString({ message: 'New password must be a string' })
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  newPassword: string;
}
