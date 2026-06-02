import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsNotEmpty } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'User ID to receive the notification',
    example: 'clx1234567890',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Notification type',
    example: 'transfer_request',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description: 'Notification title',
    example: 'New Team Transfer Request',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'A team member has requested to transfer to another team.',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    description: 'Optional link to related page',
    example: '/teams/123/transfers/456',
  })
  @IsString()
  @IsOptional()
  link?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { transferId: 'clx123', fromTeamId: 'clx456' },
  })
  @IsObject()
  @IsOptional()
  meta?: any;

  @ApiProperty({
    description: 'Idempotency key to prevent duplicates',
    example: 'event123:user456:transfer_request',
  })
  @IsString()
  @IsNotEmpty()
  idemKey: string;
}
