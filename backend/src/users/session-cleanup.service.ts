import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { SessionAvailability } from '@prisma/client';

@Injectable()
export class SessionCleanupService {
  private readonly logger = new Logger(SessionCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly systemConfigService: SystemConfigService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  /**
   * Runs every 10 minutes to handle two cleanup tasks:
   * 1. Mark stale sessions inactive (browser crashes, laptop sleep, internet disconnect)
   * 2. Auto-reset BREAK availability after configured timeout
   */
  @Cron('*/10 * * * *')
  async handleSessionMaintenance() {
    try {
      const config = await this.systemConfigService.getSessionConfig();
      await Promise.all([
        this.cleanupStaleSessions(config.maxSessionDurationHours),
        this.resetExpiredBreaks(config.breakAutoResetMinutes),
      ]);
    } catch (error) {
      this.logger.error('Session maintenance failed', error?.message);
    }
  }

  private async cleanupStaleSessions(maxDurationHours: number) {
    const cutoff = new Date(Date.now() - maxDurationHours * 60 * 60 * 1000);

    const result = await (this.prisma as any).userSession.updateMany({
      where: {
        isActive: true,
        lastActivityAt: { lt: cutoff },
      },
      data: { isActive: false },
    });

    if (result.count > 0) {
      this.logger.log(
        `Stale session cleanup: marked ${result.count} session(s) inactive (threshold: ${maxDurationHours}h)`,
      );
      this.notificationsGateway
        .broadcastToAdmins('session:updated', {
          type: 'sessions_cleaned',
          count: result.count,
        })
        .catch(() => {/* non-critical */});
    }
  }

  private async resetExpiredBreaks(breakAutoResetMinutes: number) {
    const cutoff = new Date(Date.now() - breakAutoResetMinutes * 60 * 1000);

    const result = await (this.prisma as any).userSession.updateMany({
      where: {
        isActive: true,
        availability: SessionAvailability.BREAK,
        availabilityUpdatedAt: { lt: cutoff },
      },
      data: {
        availability: SessionAvailability.ACTIVE,
        availabilityUpdatedAt: new Date(),
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `Break auto-reset: ${result.count} session(s) reset to ACTIVE (threshold: ${breakAutoResetMinutes}min)`,
      );
      this.notificationsGateway
        .broadcastToAdmins('session:updated', {
          type: 'break_reset',
          count: result.count,
        })
        .catch(() => {/* non-critical */});
    }
  }
}
