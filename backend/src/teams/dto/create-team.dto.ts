import {
  IsString,
  IsOptional,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTeamDto {
  @ApiProperty({
    description: 'Team name (must be unique)',
    example: 'Healthcare Recruitment Team A',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2, { message: 'Team name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Team name cannot exceed 100 characters' })
  name: string;

  @ApiPropertyOptional({
    description: 'ID of the team lead user',
    example: 'user123',
  })
  @IsOptional()
  @IsUUID()
  leadId?: string;

  @ApiPropertyOptional({
    description: 'ID of the team head user',
    example: 'user456',
  })
  @IsOptional()
  @IsUUID()
  headId?: string;

  @ApiPropertyOptional({
    description: 'ID of the team manager user',
    example: 'user789',
  })
  @IsOptional()
  @IsUUID()
  managerId?: string;
}
