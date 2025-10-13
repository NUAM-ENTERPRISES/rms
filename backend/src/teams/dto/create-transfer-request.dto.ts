import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateTransferRequestDto {
  @ApiProperty({
    description: 'User ID to be transferred',
    example: 'clx1234567890',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Target team ID',
    example: 'clx1234567890',
  })
  @IsString()
  @IsNotEmpty()
  toTeamId: string;

  @ApiPropertyOptional({
    description: 'Reason for transfer request',
    example: 'Better team fit and growth opportunities',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
