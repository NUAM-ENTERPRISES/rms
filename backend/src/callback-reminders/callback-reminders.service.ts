import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CallbackRemindersService {
  private readonly logger = new Logger(CallbackRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('callback-reminders') private readonly callbackQueue: Queue,
  ) {}

  async createCallbackReminder(
    candidateId: string,
    recruiterId: string,
    statusHistoryId: string,
    callbackDateTime?: string | null,
  ): Promise<any> {
    if (!callbackDateTime) {
      throw new Error('Callback datetime is required for Call Back status');
    }

    const scheduledFor = new Date(callbackDateTime);
    if (Number.isNaN(scheduledFor.getTime())) {
      throw new Error('Invalid callback datetime');
    }

    const minimalScheduledFor = new Date(Math.max(Date.now(), scheduledFor.getTime()));
    const delay = Math.max(0, minimalScheduledFor.getTime() - Date.now());

    await this.cancelCallbackReminders(candidateId);

    const reminder = await this.prisma.callbackReminder.create({
      data: {
        candidateId,
        recruiterId,
        statusHistoryId,
        scheduledFor: minimalScheduledFor,
        status: 'pending',
      },
    });

    await this.callbackQueue.add(
      'callback-reminder',
      { reminderId: reminder.id },
      {
        jobId: `callback_reminder:${reminder.id}`,
        delay,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(
      `Scheduled callback reminder ${reminder.id} for candidate ${candidateId} at ${minimalScheduledFor.toISOString()}`,
    );

    return reminder;
  }

  async cancelCallbackReminders(candidateId: string): Promise<void> {
    const reminders = await this.prisma.callbackReminder.findMany({
      where: {
        candidateId,
        status: 'pending',
      },
      select: {
        id: true,
      },
    });

    for (const reminder of reminders) {
      const job = await this.callbackQueue.getJob(`callback_reminder:${reminder.id}`);
      if (job) {
        await job.remove();
        this.logger.log(`Removed callback queue job for reminder ${reminder.id}`);
      }
    }

    await this.prisma.callbackReminder.updateMany({
      where: {
        candidateId,
        status: 'pending',
      },
      data: {
        status: 'cancelled',
      },
    });
  }
}
