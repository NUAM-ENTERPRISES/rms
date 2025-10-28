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
          `Notification with idemKey ${dto.idemKey} already exists, skipping creation`,
        );
        return this.mapToResponseDto(existingNotification);
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
    } catch (error) {
      this.logger.error(
        `Failed to create notification: ${error.message}`,
        error.stack,
      );
      throw error;
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
