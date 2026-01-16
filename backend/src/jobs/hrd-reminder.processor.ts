import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { SystemConfigService, HRDSettings } from '../system-config/system-config.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Processor('hrd-reminders')
export class HrdReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(HrdReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('hrd-reminders') private readonly hrdQueue: Queue,
    private readonly systemConfigService: SystemConfigService,
    @Inject(forwardRef(() => NotificationsGateway)) private readonly notificationsGateway: NotificationsGateway,
  ) {
    super();
    this.logger.log('✅ HrdReminderProcessor initialized');
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { reminderId, processingStepId, processingCandidateId, assignedTo } = job.data;
    this.logger.log(`Processing HRD reminder job ${job.id} for step ${processingStepId}`);

    try {
      const settings: HRDSettings = await this.systemConfigService.getHRDSettings();
      this.logger.log(`Processing HRD reminder job ${job.id} for step ${processingStepId} (reminderId=${reminderId})`);
      this.logger.debug(`HRD settings: ${JSON.stringify(settings)}`);

      const reminder = await this.prisma.hRDReminder.findUnique({ where: { id: reminderId }, include: { processingStep: { include: { template: true, documents: { include: { candidateProjectDocumentVerification: true } } } }, processingCandidate: { include: { candidate: true, project: true } } } });

      if (!reminder || reminder.status === 'cancelled' || reminder.status === 'completed') {
        this.logger.log(`Reminder ${reminderId} missing or already completed/cancelled. Skipping.`);
        return { success: false, reason: 'missing or already processed' };
      }

      this.logger.log(`Reminder record: id=${reminder.id}, scheduledFor=${reminder.scheduledFor?.toISOString()}, reminderCount=${reminder.reminderCount}, dailyCount=${reminder.dailyCount}, daysCompleted=${reminder.daysCompleted}`);

      // Re-check whether HRD is already completed/verified
      const step = await this.prisma.processingStep.findUnique({ where: { id: processingStepId }, include: { template: true, documents: { include: { candidateProjectDocumentVerification: true } } } });

      if (!step) {
        this.logger.warn(`Processing step ${processingStepId} not found. Marking reminder as completed.`);
        await this.prisma.hRDReminder.update({ where: { id: reminderId }, data: { status: 'completed' } });
        return { success: false, reason: 'step not found' };
      }

      // Cancel if step is marked completed or cancelled
      if (step.status === 'completed' || step.status === 'cancelled') {
        this.logger.log(`HRD step ${processingStepId} status is '${step.status}'. Cancelling reminder ${reminderId}`);
        await this.prisma.hRDReminder.update({ where: { id: reminderId }, data: { status: 'completed' } });
        return { success: false, reason: 'step completed or cancelled' };
      }

      // If submittedAt is not set, do not send reminders (it means step hasn't been submitted by candidate)
      if (!step.submittedAt) {
        this.logger.log(`HRD step ${processingStepId} has no submittedAt. Cancelling reminder ${reminderId}`);
        await this.prisma.hRDReminder.update({ where: { id: reminderId }, data: { status: 'completed' } });
        return { success: false, reason: 'no submittedAt' };
      }

      // NOTE: Do NOT cancel solely because a document verification exists. The business requirement
      // is to continue sending HRD reminders until the step itself is marked completed/cancelled.
      // This allows sending reminders even when documents are verified but step completion is pending.

      // If not verified, send notification to assigned user
      // Resolve assignedTo if not provided in job.data
      let finalAssignedTo = assignedTo || reminder.assignedTo || step.assignedTo || (reminder.processingCandidate ? (reminder.processingCandidate.assignedProcessingTeamUserId || null) : null);

      if (!finalAssignedTo) {
        this.logger.warn(`No assigned processing user for step ${processingStepId}. Cannot send HRD reminder.`);
      } else {
        const candidate = reminder.processingCandidate?.candidate;
        const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Candidate';
        const projectName = (reminder.processingCandidate && (reminder.processingCandidate as any).project && (reminder.processingCandidate as any).project.name) ? (reminder.processingCandidate as any).project.name : 'Project';

        // Prepare submittedAt formatting
        const submittedAtISO = step.submittedAt ? new Date(step.submittedAt).toISOString() : null;
        const submittedAtFormatted = submittedAtISO ? submittedAtISO.slice(0, 19).replace('T', ' ') : 'unknown';

        // Create notification record
        await this.prisma.notification.create({
          data: {
            userId: finalAssignedTo,
            type: 'HRD_REMINDER',
            title: `HRD Follow-up required for ${candidateName}`,
            message: `HRD step for ${candidateName} was submitted on ${submittedAtFormatted} and is not yet verified. Please follow up.`,
            link: `/processingCandidateDetails/${processingCandidateId}`,
            status: 'unread',
            idemKey: `hrd_reminder_${reminderId}_${Date.now()}`,
            meta: { processingStepId, processingCandidateId, reminderId, submittedAt: submittedAtISO },
          },
        });

        // Persist reminder update (sent) and ensure assignedTo is stored
        const updatedReminder = await this.prisma.hRDReminder.update({
          where: { id: reminderId },
          data: {
            status: 'sent',
            sentAt: new Date(),
            reminderCount: reminder.reminderCount + 1,
            dailyCount: reminder.dailyCount + 1,
            lastReminderDate: new Date(),
            assignedTo: finalAssignedTo,
          },
        });

        this.logger.log(`Sent HRD reminder ${reminderId} to user ${finalAssignedTo}`);

        // Emit realtime event to assigned user with payload
        try {
          const payload = {
            type: 'hrdReminder.sent',
            payload: {
              reminder: updatedReminder,
              reminderId: updatedReminder.id,
              stepId: updatedReminder.processingStepId,
              processingId: updatedReminder.processingCandidateId,
              scheduledFor: updatedReminder.scheduledFor,
              sentAt: updatedReminder.sentAt,
              assignedToId: updatedReminder.assignedTo,
              submittedAt: step.submittedAt ? new Date(step.submittedAt).toISOString() : null,
              title: 'HRD Reminder',
              body: `Please process HRD for ${candidateName} (${projectName})`,
              route: `/processingCandidateDetails/${updatedReminder.processingCandidateId}`,
            },
          };

          await this.notificationsGateway.emitToUser(updatedReminder.assignedTo!, 'hrdReminder.sent', payload);
          this.logger.log(`Emitted hrdReminder.sent to user ${updatedReminder.assignedTo} for reminder ${updatedReminder.id}`);
        } catch (err) {
          this.logger.error(`Failed to emit hrdReminder.sent for reminder ${reminderId}: ${err.message}`, err.stack);
        }
      }

      // Optionally schedule next reminder based on dailyTimes and totalDays
      const dailyTimes = (settings.dailyTimes && settings.dailyTimes.length > 0) ? settings.dailyTimes.slice(0, settings.remindersPerDay || settings.dailyTimes.length) : ['09:00'];

      // Helper to combine date + time string
      const combine = (date: Date, hhmm: string) => {
        const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
        const d = new Date(date);
        d.setHours(Number.isNaN(h) ? 9 : h, Number.isNaN(m) ? 0 : m, 0, 0);
        return d;
      };

      const scheduledDate = new Date(reminder.scheduledFor);
      const now = new Date();

      // Find next allowed time on same day after current scheduled time
      const nextSameDay = dailyTimes
        .map((t) => combine(scheduledDate, t))
        .find((dt) => dt.getTime() > scheduledDate.getTime());

      let nextScheduledFor: Date | null = null;
      let newDaysCompleted = reminder.daysCompleted;
      let newDailyCount = reminder.dailyCount;

      if (nextSameDay) {
        // schedule later today
        nextScheduledFor = nextSameDay;
        newDailyCount = reminder.dailyCount + 1;
      } else {
        // move to next day at first allowed time
        const nextDay = new Date(scheduledDate.getTime() + 24 * 60 * 60 * 1000);
        nextScheduledFor = combine(nextDay, dailyTimes[0]);
        newDaysCompleted = reminder.daysCompleted + 1;
        newDailyCount = 0; // reset for new day
      }

      if (newDaysCompleted < settings.totalDays) {
        // Update DB and enqueue next job
        await this.prisma.hRDReminder.update({ where: { id: reminderId }, data: { scheduledFor: nextScheduledFor, status: 'pending', daysCompleted: newDaysCompleted, dailyCount: newDailyCount } });

        const delayMs = Math.max(0, nextScheduledFor.getTime() - Date.now());
        await this.hrdQueue.add(
          'send-hrd-reminder',
          { reminderId, processingStepId, processingCandidateId, assignedTo },
          { delay: delayMs, attempts: 3, removeOnComplete: true, removeOnFail: false },
        );

        this.logger.log(`Scheduled follow-up reminder for ${reminderId} at ${nextScheduledFor}`);
      } else {
        // mark completed if reached totalDays
        await this.prisma.hRDReminder.update({ where: { id: reminderId }, data: { status: 'completed' } });
        this.logger.log(`HRD reminder ${reminderId} completed after reaching totalDays`);
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to process HRD reminder job ${job.id}:`, error);
      throw error;
    }
  }
}
