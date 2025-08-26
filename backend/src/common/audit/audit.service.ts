import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface AuditLogData {
  actionType:
    | 'create'
    | 'update'
    | 'delete'
    | 'login'
    | 'logout'
    | 'password_change'
    | 'role_assignment'
    | 'role_removal'
    | 'project_assignment'
    | 'candidate_assignment'
    | 'document_verification'
    | 'interview_scheduling'
    | 'status_change';
  entityId: string;
  entityType: string;
  userId: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(data: AuditLogData): Promise<void> {
    try {
      await (this.prisma as any).auditLog.create({
        data: {
          actionType: data.actionType,
          entityId: data.entityId,
          entityType: data.entityType,
          userId: data.userId,
          changes: data.changes || {},
          timestamp: new Date(),
        },
      });
    } catch (error) {
      // Don't let audit logging failures break the main application
      console.error('Audit logging failed:', error);
    }
  }

  async logUserAction(
    actionType: AuditLogData['actionType'],
    userId: string,
    targetUserId: string,
    changes?: Record<string, any>,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.log({
      actionType,
      entityId: targetUserId,
      entityType: 'user',
      userId,
      changes,
      metadata,
    });
  }

  async logAuthAction(
    actionType: 'login' | 'logout' | 'password_change',
    userId: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.log({
      actionType,
      entityId: userId,
      entityType: 'auth',
      userId,
      metadata,
    });
  }

  async logRoleAction(
    actionType: 'role_assignment' | 'role_removal',
    userId: string,
    targetUserId: string,
    roleId: string,
    roleName: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.log({
      actionType,
      entityId: targetUserId,
      entityType: 'role',
      userId,
      changes: {
        roleId,
        roleName,
      },
      metadata,
    });
  }

  async getAuditLogs(
    entityType?: string,
    entityId?: string,
    userId?: string,
    actionType?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<any[]> {
    const where: any = {};

    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (userId) where.userId = userId;
    if (actionType) where.actionType = actionType;

    return await (this.prisma as any).auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getAuditLogsForEntity(
    entityType: string,
    entityId: string,
    limit: number = 50,
  ): Promise<any[]> {
    return await this.getAuditLogs(
      entityType,
      entityId,
      undefined,
      undefined,
      limit,
      0,
    );
  }

  async getAuditLogsForUser(
    userId: string,
    limit: number = 50,
  ): Promise<any[]> {
    return await this.getAuditLogs(
      undefined,
      undefined,
      userId,
      undefined,
      limit,
      0,
    );
  }
}
