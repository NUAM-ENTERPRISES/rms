import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SystemConfigResponse } from './dto/system-config.dto';
import { DOCUMENT_TYPE_META } from '../common/constants/document-types';

@Injectable()
export class SystemService {
  constructor(private readonly prisma: PrismaService) {}

  async getSystemConfig(parts: string[] = []): Promise<SystemConfigResponse> {
    const includeAll = parts.length === 0;
    const includeRoles = includeAll || parts.includes('roles');
    const includeFullPermissions = includeAll || parts.includes('permissions');
    
    // Granular flags for performance optimization
    const includeReligions = includeAll || parts.includes('religions');
    const includeStates = includeAll || parts.includes('states');
    const includeDocTypes = includeAll || parts.includes('documentTypes');
    const includeStatuses = includeAll || parts.includes('statuses');
    
    // Backward compatibility for 'constants' part
    const includeConstants = parts.includes('constants');
    const finalIncludeReligions = includeReligions || includeConstants;
    const finalIncludeStates = includeStates || includeConstants;
    const finalIncludeDocTypes = includeDocTypes || includeConstants;
    const finalIncludeStatuses = includeStatuses || includeConstants;

    // Get all roles with their configurations - Only if requested
    let roles: any[] = [];
    if (includeRoles) {
      roles = await this.prisma.role.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          ...(includeFullPermissions ? {
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
          } : {}),
        },
        orderBy: {
          name: 'asc',
        },
      });
    }

    // Get religions only if requested
    let religions: any[] = [];
    if (finalIncludeReligions) {
      religions = await this.prisma.religion.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
        },
      });
    }

    // Get Indian states only if requested
    let indianStates: any[] = [];
    if (finalIncludeStates) {
      indianStates = await this.prisma.state.findMany({
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
    }

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

    // Build constants object dynamically based on requested parts
    const constants: any = {};
    
    if (finalIncludeDocTypes) {
      constants.documentTypes = DOCUMENT_TYPE_META;
    }
    
    if (finalIncludeStatuses) {
      constants.candidateStatuses = {
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
      };
    }
    
    if (finalIncludeReligions) {
      constants.religions = religions;
    }
    
    if (finalIncludeStates) {
      constants.indianStates = indianStates;
    }

    return {
      success: true,
      data: {
        roles: includeRoles
          ? roles.map((role) => ({
              id: role.id,
              name: role.name,
              description: role.description,
              permissions: includeFullPermissions 
                ? role.rolePermissions.map((rp) => rp.permission.key)
                : [],
              badgeConfig: roleBadgeConfig[role.name] || {
                variant: 'outline',
                priority: 999,
              },
            }))
          : [],
        roleBadgeConfig: includeRoles ? roleBadgeConfig : {},
        constants,
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
      },
      message: 'System configuration retrieved successfully',
    };
  }
}
