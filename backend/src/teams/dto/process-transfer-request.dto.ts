import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';

export class ProcessTransferRequestDto {
  @ApiProperty({
    description: 'Action to take on the transfer request',
    enum: ['approve', 'reject'],
    example: 'approve',
  })
  @IsString()
  @IsIn(['approve', 'reject'])
  action: 'approve' | 'reject';

  @ApiPropertyOptional({
    description: 'Reason for approval or rejection',
    example: 'Approved after team capacity review',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
