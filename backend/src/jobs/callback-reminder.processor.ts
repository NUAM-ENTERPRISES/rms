import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CallbackRemindersService } from '../callback-reminders/callback-reminders.service';

@Processor('callback-reminders')
export class CallbackReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(CallbackReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly callbackRemindersService: CallbackRemindersService,
  ) {
    super();
  }

  async process(job: Job): Promise<{ success: boolean; reason?: string }> {
    const { reminderId, candidateId } = job.data;
    this.logger.log(
      `Processing callback reminder job ${job.id} for candidate ${candidateId}`,
    );

    const reminder = await this.prisma.callbackReminder.findUnique({
      where: { id: reminderId },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            countryCode: true,
            mobileNumber: true,
            currentStatus: { select: { id: true, statusName: true } },
          },
        },
        statusHistory: {
          select: {
            statusUpdatedAt: true,
            reason: true,
          },
        },
      },
    });

    if (!reminder || reminder.status === 'cancelled' || reminder.status === 'completed') {
      return { success: false, reason: 'Reminder cancelled or completed' };
    }

    const statusName = reminder.candidate.currentStatus?.statusName ?? '';
    if (!this.callbackRemindersService.isCallBackStatusName(statusName)) {
      await this.prisma.callbackReminder.update({
        where: { id: reminderId },
        data: { status: 'completed' },
      });
      return { success: false, reason: 'Candidate no longer on Call Back status' };
    }

    if (reminder.sentAt) {
      return { success: false, reason: 'Reminder already sent' };
    }

    const candidateName = `${reminder.candidate.firstName} ${reminder.candidate.lastName}`;
    const scheduledLabel = reminder.scheduledFor.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const sentAt = new Date();
    await this.prisma.callbackReminder.update({
      where: { id: reminderId },
      data: {
        status: 'sent',
        sentAt,
      },
    });

    await this.notificationsService.createNotification({
      userId: reminder.recruiterId,
      type: 'CALLBACK_REMINDER',
      title: 'Call back reminder',
      message: `Please call ${candidateName}. Scheduled callback was due at ${scheduledLabel}.`,
      link: `/candidates/${reminder.candidateId}`,
      meta: {
        candidateId: reminder.candidateId,
        candidateName,
        reminderId: reminder.id,
        scheduledFor: reminder.scheduledFor.toISOString(),
        statusHistoryId: reminder.statusHistoryId,
        countryCode: reminder.candidate.countryCode,
        mobileNumber: reminder.candidate.mobileNumber,
        candidate: {
          id: reminder.candidate.id,
          firstName: reminder.candidate.firstName,
          lastName: reminder.candidate.lastName,
          countryCode: reminder.candidate.countryCode,
          mobileNumber: reminder.candidate.mobileNumber,
          currentStatus: reminder.candidate.currentStatus,
        },
        statusHistory: {
          statusUpdatedAt: reminder.statusHistory.statusUpdatedAt.toISOString(),
          reason: reminder.statusHistory.reason ?? undefined,
        },
      },
      idemKey: `callback_reminder_${reminder.id}_${reminder.scheduledFor.getTime()}`,
    });

    this.logger.log(
      `Sent CALLBACK_REMINDER for candidate ${candidateId} to recruiter ${reminder.recruiterId}`,
    );

    return { success: true };
  }
}
