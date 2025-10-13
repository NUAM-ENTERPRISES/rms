import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransferRequestResponseDto {
  @ApiProperty({
    description: 'Transfer request ID',
    example: 'clx1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'User being transferred',
    example: {
      id: 'clx1234567890',
      name: 'John Doe',
      email: 'john@example.com',
    },
  })
  user: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty({
    description: 'Source team',
    example: {
      id: 'clx1234567890',
      name: 'Team Alpha',
    },
  })
  fromTeam: {
    id: string;
    name: string;
  };

  @ApiProperty({
    description: 'Target team',
    example: {
      id: 'clx1234567890',
      name: 'Team Beta',
    },
  })
  toTeam: {
    id: string;
    name: string;
  };

  @ApiProperty({
    description: 'User who requested the transfer',
    example: {
      id: 'clx1234567890',
      name: 'Jane Smith',
      email: 'jane@example.com',
    },
  })
  requester: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty({
    description: 'Transfer request status',
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    example: 'pending',
  })
  status: string;

  @ApiPropertyOptional({
    description: 'Reason for transfer request',
    example: 'Better team fit and growth opportunities',
  })
  reason?: string;

  @ApiPropertyOptional({
    description: 'User who approved/rejected the request',
    example: {
      id: 'clx1234567890',
      name: 'Manager Name',
      email: 'manager@example.com',
    },
  })
  approver?: {
    id: string;
    name: string;
    email: string;
  };

  @ApiPropertyOptional({
    description: 'When the request was approved/rejected',
    example: '2025-01-08T20:13:25.000Z',
  })
  approvedAt?: Date;

  @ApiProperty({
    description: 'When the request was created',
    example: '2025-01-08T20:13:25.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the request was last updated',
    example: '2025-01-08T20:13:25.000Z',
  })
  updatedAt: Date;
}

export class PaginatedTransferRequestsResponseDto {
  @ApiProperty({
    description: 'Array of transfer requests',
    type: [TransferRequestResponseDto],
  })
  transferRequests: TransferRequestResponseDto[];

  @ApiProperty({
    description: 'Total count of transfer requests',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: 'Number of records returned',
    example: 20,
  })
  count: number;

  @ApiProperty({
    description: 'Number of records skipped',
    example: 0,
  })
  offset: number;
}
