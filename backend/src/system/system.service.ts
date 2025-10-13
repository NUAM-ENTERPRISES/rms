import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SystemConfigResponse } from './dto/system-config.dto';

@Injectable()
export class SystemService {
  constructor(private readonly prisma: PrismaService) {}

  async getSystemConfig(): Promise<SystemConfigResponse> {
    // Get all roles with their configurations
    const roles = await this.prisma.role.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        rolePermissions: {
          select: {
            permission: {
              select: {
                key: true,
                description: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Get role badge configurations
    const roleBadgeConfig = {
      CEO: { variant: 'default', priority: 1 },
      Director: { variant: 'default', priority: 2 },
      'System Admin': { variant: 'default', priority: 3 },
      Manager: { variant: 'secondary', priority: 4 },
      'Team Head': { variant: 'secondary', priority: 5 },
      'Team Lead': { variant: 'outline', priority: 6 },
      Recruiter: { variant: 'outline', priority: 7 },
      'Documentation Executive': { variant: 'outline', priority: 8 },
      'Processing Executive': { variant: 'outline', priority: 9 },
    };

    // Get system constants
    const constants = {
      documentTypes: {
        PASSPORT: { displayName: 'Passport', category: 'identity' },
        AADHAAR: { displayName: 'Aadhaar Card', category: 'identity' },
        PAN_CARD: { displayName: 'PAN Card', category: 'identity' },
        // Add more as needed
      },
      candidateStatuses: {
        APPLIED: { displayName: 'Applied', color: 'blue' },
        SHORTLISTED: { displayName: 'Shortlisted', color: 'green' },
        REJECTED: { displayName: 'Rejected', color: 'red' },
        // Add more as needed
      },
    };

    return {
      success: true,
      data: {
        roles: roles.map((role) => ({
          id: role.id,
          name: role.name,
          description: role.description,
          permissions: role.rolePermissions.map((rp) => rp.permission.key),
          badgeConfig: roleBadgeConfig[role.name] || {
            variant: 'outline',
            priority: 999,
          },
        })),
        roleBadgeConfig,
        constants,
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
      },
      message: 'System configuration retrieved successfully',
    };
  }
}
