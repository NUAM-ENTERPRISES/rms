import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
@Processor('callback-reminders')
export class CallbackReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(CallbackReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<{ reminderId: string }>) {
    const reminderId = job.data?.reminderId;
    if (!reminderId) {
      this.logger.warn('Callback reminder job missing reminderId');
      return;
    }

    const reminder = await this.prisma.callbackReminder.findUnique({
      where: { id: reminderId },
      include: {
        candidate: true,
        statusHistory: true,
      },
    });

    if (!reminder) {
      this.logger.warn(`Callback reminder ${reminderId} not found`);
      return;
    }

    if (reminder.status !== 'pending') {
      this.logger.log(`Callback reminder ${reminderId} already handled with status ${reminder.status}`);
      return;
    }

    const candidateName = `${reminder.candidate.firstName} ${reminder.candidate.lastName}`;
    const scheduledDate = reminder.scheduledFor.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    await this.notificationsService.createNotification({
      userId: reminder.recruiterId,
      type: 'CALLBACK_REMINDER',
      title: 'Callback Reminder',
      message: `Call back candidate ${candidateName} at ${scheduledDate}`,
      link: `/candidates/${reminder.candidateId}`,
      meta: {
        candidateId: reminder.candidateId,
        candidateName,
        callbackDateTime: reminder.scheduledFor.toISOString(),
        statusHistoryId: reminder.statusHistoryId,
      },
      idemKey: `callback_reminder_${reminder.id}_${Date.now()}`,
    });

    await this.prisma.callbackReminder.update({
      where: { id: reminder.id },
      data: {
        sentAt: new Date(),
        status: 'completed',
      },
    });

    this.logger.log(`Sent callback reminder notification for ${reminder.id}`);
  }
}
