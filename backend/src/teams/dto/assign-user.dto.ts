import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignUserDto {
  @ApiProperty({
    description: 'User ID to assign to the team',
    example: 'user123',
  })
  @IsString()
  userId: string;

  @ApiPropertyOptional({
    description: 'Role within the team (optional)',
    example: 'recruiter',
  })
  @IsOptional()
  @IsString()
  role?: string;
}
