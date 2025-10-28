import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SystemConfigResponse } from './dto/system-config.dto';
import { DOCUMENT_TYPE_META } from '../common/constants/document-types';

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

    // Get religions
    const religions = await this.prisma.religion.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
      },
    });

    // Get Indian states
    const indianStates = await this.prisma.state.findMany({
      where: {
        countryCode: 'IN',
        isActive: true,
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
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
      documentTypes: DOCUMENT_TYPE_META,
      candidateStatuses: {
        APPLIED: { displayName: 'Applied', color: 'blue' },
        SHORTLISTED: { displayName: 'Shortlisted', color: 'green' },
        REJECTED: { displayName: 'Rejected', color: 'red' },
        NOMINATED: { displayName: 'Nominated', color: 'orange' },
        VERIFICATION_IN_PROGRESS: {
          displayName: 'Verification in Progress',
          color: 'yellow',
        },
        DOCUMENTS_VERIFIED: {
          displayName: 'Documents Verified',
          color: 'green',
        },
        REJECTED_DOCUMENTS: { displayName: 'Documents Rejected', color: 'red' },
        PENDING_DOCUMENTS: { displayName: 'Pending Documents', color: 'gray' },
      },
      religions: religions,
      indianStates: indianStates,
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
