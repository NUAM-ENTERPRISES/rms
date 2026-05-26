import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import {
  NotificationResponseDto,
  PaginatedNotificationsResponseDto,
} from './dto/notification-response.dto';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async createNotification(
    dto: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    try {
      // Check if notification with same idemKey already exists
      const existingNotification = await this.prisma.notification.findUnique({
        where: { idemKey: dto.idemKey },
      });

      if (existingNotification) {
        this.logger.debug(
          `Notification with idemKey ${dto.idemKey} already exists, re-emitting event`,
        );

        await this.notificationsGateway.emitToUser(
          dto.userId,
          'notification:new',
          this.mapToResponseDto(existingNotification),
        );

        return this.mapToResponseDto(existingNotification);
      }

      // Ensure target user exists to avoid foreign key violations
      const targetUser = await this.prisma.user.findUnique({ where: { id: dto.userId } });
      if (!targetUser) {
        this.logger.warn(`User ${dto.userId} not found; cannot create notification`);
        throw new Error(`User ${dto.userId} not found`);
      }

      const notification = await this.prisma.notification.create({
        data: {
          userId: dto.userId,
          type: dto.type,
          title: dto.title,
          message: dto.message,
          link: dto.link,
          meta: dto.meta,
          idemKey: dto.idemKey,
        },
      });

      this.logger.log(
        `Created notification ${notification.id} for user ${dto.userId}`,
      );

      // Emit real-time event via WebSocket gateway
      await this.notificationsGateway.emitToUser(
        dto.userId,
        'notification:new',
        {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          link: notification.link,
          meta: notification.meta,
          status: notification.status,
          createdAt: notification.createdAt,
        },
      );

      return this.mapToResponseDto(notification);
    } catch (error: unknown) {
      const err =
        error instanceof Error ? error : new Error(String(error ?? 'Unknown error'));

      this.logger.error(
        `Failed to create notification: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  async getUserNotifications(
    userId: string,
    query: QueryNotificationsDto,
  ): Promise<PaginatedNotificationsResponseDto> {
    const { status, type, limit = 20, cursor } = query;

    const where: any = {
      userId,
    };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (cursor) {
      where.id = {
        lt: cursor, // Get notifications older than cursor
      };
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit + 1, // Take one extra to check if there are more
      }),
      this.prisma.notification.count({
        where: {
          userId,
        },
      }),
    ]);

    const hasMore = notifications.length > limit;
    const result = hasMore ? notifications.slice(0, limit) : notifications;
    const nextCursor = hasMore ? result[result.length - 1].id : undefined;

    return {
      notifications: result.map(this.mapToResponseDto),
      total,
      hasMore,
      nextCursor,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        status: 'unread',
      },
    });
  }

  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<NotificationResponseDto> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId, // Ensure user can only mark their own notifications as read
      },
    });

    if (!notification) {
      throw new Error('Notification not found or access denied');
    }

    const updatedNotification = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'read',
        seen: true, // Keep legacy field in sync
        readAt: new Date(),
      },
    });

    this.logger.log(
      `Marked notification ${notificationId} as read for user ${userId}`,
    );

    return this.mapToResponseDto(updatedNotification);
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        status: 'unread',
      },
      data: {
        status: 'read',
        seen: true, // Keep legacy field in sync
        readAt: new Date(),
      },
    });

    this.logger.log(
      `Marked ${result.count} notifications as read for user ${userId}`,
    );

    return { count: result.count };
  }

  // user notification preferences
  async getMuteStatus(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationSoundMuted: true },
    });
    return user?.notificationSoundMuted ?? false;
  }

  async setMuteStatus(userId: string, muted: boolean): Promise<{ muted: boolean }> {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { notificationSoundMuted: muted },
      select: { notificationSoundMuted: true },
    });
    return { muted: updated.notificationSoundMuted };
  }

  /**
   * Resolve the recruiter who should be notified for a candidate on a project.
   */
  async resolveRecruiterUserIdForCandidateProject(
    candidateId: string,
    projectId: string,
    roleCatalogId?: string | null,
  ): Promise<string | null> {
    if (roleCatalogId) {
      const roleNeeded = await this.prisma.roleNeeded.findFirst({
        where: { projectId, roleCatalogId },
        select: { id: true },
      });
      if (roleNeeded) {
        const roleMapped = await this.prisma.candidateProjects.findUnique({
          where: {
            candidateId_projectId_roleNeededId: {
              candidateId,
              projectId,
              roleNeededId: roleNeeded.id,
            },
          },
          select: { recruiterId: true },
        });
        if (roleMapped?.recruiterId) {
          return roleMapped.recruiterId;
        }
      }
    }

    const projectMapped = await this.prisma.candidateProjects.findFirst({
      where: {
        candidateId,
        projectId,
        recruiterId: { not: null },
      },
      select: { recruiterId: true },
      orderBy: { updatedAt: 'desc' },
    });
    if (projectMapped?.recruiterId) {
      return projectMapped.recruiterId;
    }

    const assignment = await this.prisma.candidateRecruiterAssignment.findFirst({
      where: { candidateId, isActive: true },
      select: { recruiterId: true },
      orderBy: { assignedAt: 'desc' },
    });

    return assignment?.recruiterId ?? null;
  }

  /**
   * Notify recruiter and interview stakeholders when documents are sent to the client.
   */
  async notifyDocumentsForwardedToClient(params: {
    eventId: string;
    candidateId: string;
    projectId: string;
    senderId: string;
    recipientEmail: string;
    roleCatalogId?: string | null;
  }): Promise<{ count: number }> {
    const {
      eventId,
      candidateId,
      projectId,
      senderId,
      recipientEmail,
      roleCatalogId,
    } = params;

    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { firstName: true, lastName: true },
    });
    const candidateName = candidate
      ? `${candidate.firstName} ${candidate.lastName}`
      : 'Unknown';

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { title: true },
    });
    const projectTitle = project?.title || 'Unknown Project';

    const recruiterId = await this.resolveRecruiterUserIdForCandidateProject(
      candidateId,
      projectId,
      roleCatalogId,
    );

    const [interviewStakeholders, documentationExecutives] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          userRoles: {
            some: {
              role: {
                name: {
                  in: [
                    'Interview Coordinator',
                    'Director',
                    'CEO',
                    'Manager',
                    'System Admin',
                  ],
                },
              },
            },
          },
        },
        select: { id: true },
      }),
      this.prisma.user.findMany({
        where: {
          userRoles: {
            some: {
              role: {
                name: {
                  equals: 'Documentation Executive',
                  mode: 'insensitive',
                },
              },
            },
          },
        },
        select: { id: true },
      }),
    ]);

    const documentationUserIds = new Set(
      documentationExecutives.map((user) => user.id),
    );

    const recipientIds = new Set<string>();
    if (recruiterId && recruiterId !== senderId) {
      recipientIds.add(recruiterId);
    }
    for (const user of interviewStakeholders) {
      if (user.id !== senderId) {
        recipientIds.add(user.id);
      }
    }
    for (const user of documentationExecutives) {
      recipientIds.add(user.id);
    }

    const documentVerificationLink = `/candidates/${candidateId}/documents/${projectId}`;

    this.logger.log(
      `Documents forwarded: notifying ${recipientIds.size} user(s) (recruiter=${recruiterId ?? 'none'}, documentation=${documentationUserIds.size})`,
    );

    for (const userId of recipientIds) {
      const isRecruiter = userId === recruiterId;
      const isDocumentation = documentationUserIds.has(userId);
      const isSender = userId === senderId;
      const idemKey = `${eventId}:${userId}:docs_forwarded`;

      let title: string;
      let message: string;
      let link: string;

      if (isRecruiter) {
        title = 'Documents Sent to Client';
        message = `Verified documents for ${candidateName} (${projectTitle}) were sent to the client at ${recipientEmail}.`;
        link = `/recruiter-docs/${projectId}/${candidateId}`;
      } else if (isDocumentation) {
        title = 'Sent to Client';
        message = isSender
          ? `You sent ${candidateName}'s verified documents for ${projectTitle} to ${recipientEmail}.`
          : `${candidateName}'s documents for ${projectTitle} were sent to the client at ${recipientEmail}.`;
        link = documentVerificationLink;
      } else {
        title = 'Documents Forwarded to Client';
        message = `${candidateName}'s documents for project "${projectTitle}" have been forwarded to ${recipientEmail}.`;
        link = `/interviews/shortlist-pending?search=${encodeURIComponent(candidateName)}`;
      }

      await this.createNotification({
        userId,
        type: 'documents_forwarded',
        title,
        message,
        link,
        meta: { candidateId, projectId, recipientEmail, audience: isDocumentation ? 'documentation' : isRecruiter ? 'recruiter' : 'interview' },
        idemKey,
      });
    }

    return { count: recipientIds.size };
  }

  private mapToResponseDto(notification: any): NotificationResponseDto {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      meta: notification.meta,
      status: notification.status,
      seen: notification.seen,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };
  }
}
