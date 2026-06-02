import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Processor('callback-reminders')
export class CallbackReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(CallbackReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
    this.logger.log('✅ CallbackReminderProcessor initialized');
  }

  async process(job: any): Promise<any> {
    const { reminderId, candidateId, recruiterId } = job.data;
    this.logger.log(`Processing callback reminder job ${job.id} for candidate ${candidateId}`);

    const reminder = await this.prisma.callbackReminder.findUnique({
      where: { id: reminderId },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            currentStatus: { select: { statusName: true } },
          },
        },
        recruiter: {
          select: { id: true, name: true, email: true },
        },
        statusHistory: {
          select: { callbackDateTime: true, statusUpdatedAt: true, reason: true },
        },
      },
    });

    if (!reminder) {
      this.logger.warn(`Callback reminder ${reminderId} not found`);
      return { success: false, reason: 'Reminder not found' };
    }

    if (reminder.status !== 'pending') {
      this.logger.log(`Callback reminder ${reminderId} already processed with status ${reminder.status}`);
      return { success: false, reason: 'Already processed' };
    }

    const candidate = reminder.candidate;
    const isCallbackStatus =
      candidate.currentStatus?.statusName?.toLowerCase() === 'call back' ||
      candidate.currentStatus?.statusName?.toLowerCase() === 'callback';

    if (!isCallbackStatus) {
      this.logger.log(`Candidate ${candidateId} no longer in Call Back status. Cancelling reminder.`);
      await this.prisma.callbackReminder.update({
        where: { id: reminderId },
        data: { status: 'cancelled' },
      });
      return { success: false, reason: 'Candidate no longer in callback status' };
    }

    const candidateName = `${candidate.firstName} ${candidate.lastName}`;
    const scheduleText = reminder.statusHistory.callbackDateTime
      ? new Date(reminder.statusHistory.callbackDateTime).toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'scheduled time';

    await this.notificationsService.createNotification({
      userId: reminder.recruiterId,
      type: 'CALLBACK_REMINDER',
      title: 'Candidate Call Back Reminder',
      message: `Call candidate ${candidateName} at ${scheduleText}.`,
      link: `/candidates/${candidateId}`,
      status: 'unread',
      idemKey: `callback_reminder_${candidateId}_${Date.now()}`,
      meta: {
        candidateId,
        candidateName,
        reminderType: 'callback',
        statusHistoryId: reminder.statusHistoryId,
      },
    });

    await this.prisma.callbackReminder.update({
      where: { id: reminderId },
      data: {
        status: 'sent',
        sentAt: new Date(),
        reminderCount: reminder.reminderCount + 1,
      },
    });

    this.logger.log(`Callback reminder ${reminderId} sent for candidate ${candidateId}`);
    return { success: true };
  }
}
