import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CallbackRemindersService {
  private readonly logger = new Logger(CallbackRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('callback-reminders')
    private readonly callbackQueue: Queue,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createCallbackReminder(
    candidateId: string,
    recruiterId: string,
    statusHistoryId: string,
    scheduledFor: Date,
  ): Promise<void> {
    try {
      const existingReminder = await this.prisma.callbackReminder.findFirst({
        where: {
          candidateId,
          status: {
            in: ['pending', 'sent'],
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      const delayMs = Math.max(0, scheduledFor.getTime() - Date.now());

      if (existingReminder) {
        this.logger.log(
          `Resetting existing call-back reminder for candidate ${candidateId}`,
        );

        await this.prisma.callbackReminder.update({
          where: { id: existingReminder.id },
          data: {
            scheduledFor,
            status: 'pending',
            sentAt: null,
            reminderCount: 0,
            updatedAt: new Date(),
            recruiterId,
            statusHistoryId,
          },
        });

        const jobs = await this.callbackQueue.getJobs(['waiting', 'delayed']);
        for (const job of jobs) {
          if (job.data.reminderId === existingReminder.id) {
            await job.remove();
            this.logger.log(`Removed old callback job ${job.id}`);
          }
        }

        await this.callbackQueue.add(
          'send-callback-reminder',
          {
            reminderId: existingReminder.id,
            candidateId,
            recruiterId,
          },
          {
            delay: delayMs,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            removeOnComplete: true,
            removeOnFail: false,
          },
        );

        return;
      }

      const reminder = await this.prisma.callbackReminder.create({
        data: {
          candidateId,
          recruiterId,
          statusHistoryId,
          scheduledFor,
        },
      });

      await this.callbackQueue.add(
        'send-callback-reminder',
        {
          reminderId: reminder.id,
          candidateId,
          recruiterId,
        },
        {
          delay: delayMs,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      this.logger.log(
        `Created callback reminder ${reminder.id} for candidate ${candidateId} scheduled at ${scheduledFor.toISOString()}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create callback reminder for candidate ${candidateId}:`,
        error,
      );
    }
  }

  async cancelCallbackReminders(candidateId: string): Promise<void> {
    try {
      await this.prisma.callbackReminder.updateMany({
        where: {
          candidateId,
          status: {
            in: ['pending', 'sent'],
          },
        },
        data: {
          status: 'cancelled',
          updatedAt: new Date(),
        },
      });

      const jobs = await this.callbackQueue.getJobs(['waiting', 'delayed']);
      for (const job of jobs) {
        if (job.data.candidateId === candidateId) {
          await job.remove();
          this.logger.log(`Removed callback job ${job.id} for candidate ${candidateId}`);
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to cancel callback reminders for candidate ${candidateId}:`,
        error,
      );
    }
  }

  async getRecruiterCallbackReminders(recruiterId: string): Promise<any[]> {
    return await this.prisma.callbackReminder.findMany({
      where: {
        recruiterId,
        status: {
          in: ['pending', 'sent'],
        },
      },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            countryCode: true,
            mobileNumber: true,
            currentStatus: {
              select: { id: true, statusName: true },
            },
          },
        },
        statusHistory: {
          select: {
            statusUpdatedAt: true,
            reason: true,
            callbackDateTime: true,
          },
        },
      },
      orderBy: {
        scheduledFor: 'asc',
      },
    });
  }

  async dismissReminder(reminderId: string, recruiterId: string) {
    const reminder = await this.prisma.callbackReminder.findUnique({
      where: { id: reminderId },
    });

    if (!reminder) {
      throw new NotFoundException(`Callback reminder ${reminderId} not found`);
    }

    if (reminder.recruiterId !== recruiterId) {
      throw new NotFoundException(`Callback reminder ${reminderId} does not belong to user ${recruiterId}`);
    }

    await this.prisma.callbackReminder.update({
      where: { id: reminderId },
      data: {
        status: 'completed',
        updatedAt: new Date(),
      },
    });
  }
}
