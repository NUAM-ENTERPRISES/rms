import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveCandidateDto {
  @ApiProperty({
    description: 'Action to perform',
    enum: ['approve', 'reject'],
    example: 'approve',
  })
  @IsEnum(['approve', 'reject'])
  action: 'approve' | 'reject';

  @ApiPropertyOptional({
    description: 'Approval/rejection notes',
    example: 'All documents verified successfully',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Rejection reason (required if action is reject)',
    example: 'Document verification failed',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
