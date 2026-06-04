import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { CANDIDATE_STATUS } from '../common/constants/statuses';

const MIN_DELAY_MS = 60 * 1000;

@Injectable()
export class CallbackRemindersService {
  private readonly logger = new Logger(CallbackRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('callback-reminders')
    private readonly callbackQueue: Queue,
  ) {}

  private normalizeStatusName(name: string): string {
    return name.toLowerCase().replace(/_/g, ' ').trim();
  }

  isCallBackStatusName(statusName: string): boolean {
    const n = this.normalizeStatusName(statusName);
    return n === 'call back' || n === CANDIDATE_STATUS.CALL_BACK.replace(/_/g, ' ');
  }

  async createCallbackReminder(
    candidateId: string,
    recruiterId: string,
    statusHistoryId: string,
    callbackAt: string,
  ): Promise<void> {
    const scheduledFor = new Date(callbackAt);
    const now = new Date();
    const delayInMs = scheduledFor.getTime() - now.getTime();

    if (Number.isNaN(scheduledFor.getTime())) {
      throw new BadRequestException('callbackAt must be a valid date-time');
    }

    if (delayInMs < MIN_DELAY_MS) {
      throw new BadRequestException(
        'callbackAt must be at least 1 minute in the future',
      );
    }

    try {
      const existingReminder = await this.prisma.callbackReminder.findFirst({
        where: {
          candidateId,
          status: { in: ['pending', 'sent'] },
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (existingReminder) {
        await this.prisma.callbackReminder.update({
          where: { id: existingReminder.id },
          data: {
            statusHistoryId,
            recruiterId,
            scheduledFor,
            sentAt: null,
            status: 'pending',
            updatedAt: new Date(),
          },
        });

        await this.removeQueueJobsForReminder(existingReminder.id, candidateId);

        await this.enqueueReminderJob(
          existingReminder.id,
          candidateId,
          recruiterId,
          statusHistoryId,
          delayInMs,
        );

        this.logger.log(
          `Reset callback reminder ${existingReminder.id} for candidate ${candidateId}`,
        );
        return;
      }

      const reminder = await this.prisma.callbackReminder.create({
        data: {
          candidateId,
          recruiterId,
          statusHistoryId,
          scheduledFor,
          status: 'pending',
        },
      });

      await this.enqueueReminderJob(
        reminder.id,
        candidateId,
        recruiterId,
        statusHistoryId,
        delayInMs,
      );

      this.logger.log(
        `Created callback reminder ${reminder.id} for candidate ${candidateId} at ${scheduledFor.toISOString()}`,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Failed to create callback reminder for candidate ${candidateId}:`,
        error,
      );
      throw error;
    }
  }

  async cancelCallbackReminders(candidateId: string): Promise<void> {
    try {
      const reminders = await this.prisma.callbackReminder.findMany({
        where: {
          candidateId,
          status: { in: ['pending', 'sent'] },
        },
      });

      await this.prisma.callbackReminder.updateMany({
        where: {
          candidateId,
          status: { in: ['pending', 'sent'] },
        },
        data: {
          status: 'completed',
          updatedAt: new Date(),
        },
      });

      const jobs = await this.callbackQueue.getJobs(['waiting', 'delayed']);
      for (const job of jobs) {
        if (job.data?.candidateId === candidateId) {
          await job.remove();
        }
      }

      this.logger.log(
        `Completed ${reminders.length} callback reminders for candidate ${candidateId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to cancel callback reminders for candidate ${candidateId}:`,
        error,
      );
    }
  }

  async getRecruiterCallbackReminders(recruiterId: string): Promise<any[]> {
    return this.prisma.callbackReminder.findMany({
      where: {
        recruiterId,
        status: { in: ['pending', 'sent'] },
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
          },
        },
      },
      orderBy: { scheduledFor: 'asc' },
    });
  }

  async dismissReminder(reminderId: string, recruiterId: string): Promise<void> {
    const reminder = await this.prisma.callbackReminder.findUnique({
      where: { id: reminderId },
    });

    if (!reminder) {
      throw new NotFoundException(`Reminder with ID ${reminderId} not found`);
    }

    if (reminder.recruiterId !== recruiterId) {
      throw new Error('You can only dismiss your own reminders');
    }

    await this.prisma.callbackReminder.update({
      where: { id: reminderId },
      data: { status: 'cancelled' },
    });

    await this.removeQueueJobsForReminder(reminderId, reminder.candidateId);
  }

  async processDueReminders(): Promise<number> {
    const now = new Date();
    const due = await this.prisma.callbackReminder.findMany({
      where: {
        status: 'pending',
        scheduledFor: { lte: now },
        sentAt: null,
      },
      take: 50,
    });

    let processed = 0;
    for (const reminder of due) {
      const delayInMs = Math.max(
        reminder.scheduledFor.getTime() - Date.now(),
        0,
      );
      const existingJobs = await this.callbackQueue.getJobs([
        'waiting',
        'delayed',
      ]);
      const hasJob = existingJobs.some(
        (j) => j.data?.reminderId === reminder.id,
      );
      if (!hasJob) {
        await this.enqueueReminderJob(
          reminder.id,
          reminder.candidateId,
          reminder.recruiterId,
          reminder.statusHistoryId,
          delayInMs,
        );
        processed += 1;
      }
    }
    return processed;
  }

  private async enqueueReminderJob(
    reminderId: string,
    candidateId: string,
    recruiterId: string,
    statusHistoryId: string,
    delayInMs: number,
  ): Promise<void> {
    await this.callbackQueue.add(
      'send-callback-reminder',
      {
        reminderId,
        candidateId,
        recruiterId,
        statusHistoryId,
      },
      {
        delay: delayInMs,
        jobId: `callback-reminder-${reminderId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  private async removeQueueJobsForReminder(
    reminderId: string,
    candidateId: string,
  ): Promise<void> {
    const jobs = await this.callbackQueue.getJobs(['waiting', 'delayed']);
    for (const job of jobs) {
      if (
        job.data?.reminderId === reminderId ||
        job.data?.candidateId === candidateId
      ) {
        await job.remove();
      }
    }
  }
}
