import { ApiProperty } from '@nestjs/swagger';

export interface RoleConfig {
  id: string;
  name: string;
  description?: string | null;
  permissions: string[];
  badgeConfig: {
    variant: 'default' | 'secondary' | 'outline' | 'destructive';
    priority: number;
  };
}

export interface SystemConstants {
  documentTypes: Record<string, { displayName: string; category: string }>;
  candidateStatuses: Record<string, { displayName: string; color: string }>;
  religions: Array<{ id: string; name: string }>;
  indianStates: Array<{ id: string; name: string; code: string }>;
}

export interface SystemConfigData {
  roles: RoleConfig[];
  roleBadgeConfig: Record<string, { variant: string; priority: number }>;
  constants: SystemConstants;
  version: string;
  lastUpdated: string;
}

export class SystemConfigResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({
    description: 'System configuration data',
    example: {
      roles: [
        {
          id: 'role-123',
          name: 'Manager',
          description: 'Manager role',
          permissions: ['read:users', 'manage:users'],
          badgeConfig: { variant: 'secondary', priority: 4 },
        },
      ],
      roleBadgeConfig: {
        CEO: { variant: 'default', priority: 1 },
        Manager: { variant: 'secondary', priority: 4 },
      },
      constants: {
        documentTypes: {
          PASSPORT: { displayName: 'Passport', category: 'identity' },
        },
        candidateStatuses: {
          APPLIED: { displayName: 'Applied', color: 'blue' },
        },
      },
      version: '1.0.0',
      lastUpdated: '2024-01-01T00:00:00.000Z',
    },
  })
  data: SystemConfigData;

  @ApiProperty({ example: 'System configuration retrieved successfully' })
  message: string;
}
