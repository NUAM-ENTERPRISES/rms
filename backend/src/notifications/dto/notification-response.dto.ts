import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty({
    description: 'Notification ID',
    example: 'clx1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: 'clx1234567890',
  })
  userId: string;

  @ApiProperty({
    description: 'Notification type',
    example: 'transfer_request',
  })
  type: string;

  @ApiProperty({
    description: 'Notification title',
    example: 'New Team Transfer Request',
  })
  title: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'A team member has requested to transfer to another team.',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Optional link to related page',
    example: '/teams/123/transfers/456',
  })
  link?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { transferId: 'clx123', fromTeamId: 'clx456' },
  })
  meta?: any;

  @ApiProperty({
    description: 'Notification status',
    enum: ['unread', 'read'],
    example: 'unread',
  })
  status: string;

  @ApiProperty({
    description: 'Whether notification has been seen (legacy field)',
    example: false,
  })
  seen: boolean;

  @ApiPropertyOptional({
    description: 'When notification was read',
    example: '2025-01-08T20:13:25.000Z',
  })
  readAt?: Date;

  @ApiProperty({
    description: 'When notification was created',
    example: '2025-01-08T20:13:25.000Z',
  })
  createdAt: Date;
}

export class NotificationBadgeResponseDto {
  @ApiProperty({
    description: 'Number of unread notifications',
    example: 5,
  })
  unread: number;
}

export class PaginatedNotificationsResponseDto {
  @ApiProperty({
    description: 'Array of notifications',
    type: [NotificationResponseDto],
  })
  notifications: NotificationResponseDto[];

  @ApiProperty({
    description: 'Total count of notifications',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: 'Whether there are more notifications',
    example: true,
  })
  hasMore: boolean;

  @ApiPropertyOptional({
    description: 'Next cursor for pagination',
    example: 'clx1234567890',
  })
  nextCursor?: string;
}
