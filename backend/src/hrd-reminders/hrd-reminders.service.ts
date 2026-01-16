import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { SystemConfigService, HRDSettings } from '../system-config/system-config.service';

@Injectable()
export class HrdRemindersService {
  private readonly logger = new Logger(HrdRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('hrd-reminders') private readonly hrdQueue: Queue,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  /**
   * Create or Reset HRD reminder for a processing step when submittedAt is set
   */
  async createHRDReminder(
    processingStepId: string,
    processingCandidateId: string,
    assignedTo: string | null,
    submittedAt?: Date,
  ): Promise<void> {
    try {
      const settings: HRDSettings = await this.systemConfigService.getHRDSettings();

      this.logger.log(`Creating HRD reminder: step=${processingStepId}, submittedAt=${submittedAt ?? 'now'}, settings=${JSON.stringify(settings)}`);

      // Resolve assignedTo if not provided: prefer step.assignedTo, then processingCandidate.assignedProcessingTeamUserId
      let resolvedAssignedTo = assignedTo || null;
      if (!resolvedAssignedTo) {
        const stepInfo = await this.prisma.processingStep.findUnique({ where: { id: processingStepId }, include: { processingCandidate: true } });
        if (stepInfo) {
          resolvedAssignedTo = stepInfo.assignedTo || (stepInfo.processingCandidate ? (stepInfo.processingCandidate.assignedProcessingTeamUserId || null) : null);
        }
      }

      this.logger.log(`Resolved assignedTo for step ${processingStepId} => ${resolvedAssignedTo}`);

      // Compute scheduledFor: submittedAt + daysAfterSubmission, then pick configured daily time
      const base = submittedAt ? new Date(submittedAt) : new Date();
      const targetDate = new Date(base.getTime() + settings.daysAfterSubmission * 24 * 60 * 60 * 1000);

      // Determine allowed times per day (fallback to single 09:00)
      const dailyTimes = (settings.dailyTimes && settings.dailyTimes.length > 0) ? settings.dailyTimes : ['09:00'];
      const allowedTimes = dailyTimes.slice(0, settings.remindersPerDay || dailyTimes.length);

      this.logger.debug(`HRD allowedTimes for step ${processingStepId}: ${allowedTimes.join(', ')}`);

      // Helper to combine date with HH:mm
      const combineDateTime = (date: Date, time: string) => {
        const [h, m] = time.split(':').map((x) => parseInt(x, 10));
        const d = new Date(date);
        d.setHours(Number.isNaN(h) ? 9 : h, Number.isNaN(m) ? 0 : m, 0, 0);
        return d;
      };

      // Choose initial scheduled time as first allowed time on target date (or the next available time if same-day and already past)
      let scheduledFor = combineDateTime(targetDate, allowedTimes[0]);
      const now = new Date();
      if (scheduledFor.getTime() < Date.now() && settings.daysAfterSubmission === 0) {
        // If target date is today and the chosen time already passed, pick next allowed time today or move to next day
        const nextToday = allowedTimes.map((t) => combineDateTime(targetDate, t)).find((dt) => dt.getTime() > now.getTime());
        if (nextToday) scheduledFor = nextToday;
        else scheduledFor = combineDateTime(new Date(targetDate.getTime() + 24 * 60 * 60 * 1000), allowedTimes[0]);
      }

      this.logger.log(`HRD reminder for step ${processingStepId} scheduled at ${scheduledFor.toISOString()}`);

      // If test mode is enabled, force the reminder to run shortly (useful for testing).
      if (settings.testMode?.enabled) {
        const delayMinutes = settings.testMode.immediateDelayMinutes ?? 1;
        scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000);
        this.logger.log(`[TEST MODE] Forcing HRD reminder for step ${processingStepId} to run at ${scheduledFor.toISOString()} (in ${delayMinutes} minutes)`);
      }

      // Check for existing reminder for this step
      const existing = await this.prisma.hRDReminder.findFirst({
        where: { processingStepId },
        orderBy: { updatedAt: 'desc' },
      });

      if (existing) {
        // Reset and reschedule (use resolvedAssignedTo)
        await this.prisma.hRDReminder.update({
          where: { id: existing.id },
          data: {
            processingCandidateId,
            assignedTo: resolvedAssignedTo,
            scheduledFor,
            status: 'pending',
            reminderCount: 0,
            dailyCount: 0,
            daysCompleted: 0,
            lastReminderDate: new Date(),
            updatedAt: new Date(),
          },
        });

        // remove queued jobs if any
        const jobs = await this.hrdQueue.getJobs(['waiting', 'delayed']);
        for (const job of jobs) {
          if (job.data.reminderId === existing.id) await job.remove();
        }

        const delayMs = Math.max(0, scheduledFor.getTime() - Date.now());
        await this.hrdQueue.add(
          'send-hrd-reminder',
          { reminderId: existing.id, processingStepId, processingCandidateId, assignedTo: resolvedAssignedTo },
          { delay: delayMs, attempts: 3, removeOnComplete: true, removeOnFail: false },
        );

        this.logger.log(`Reset HRD reminder ${existing.id} for step ${processingStepId} scheduled at ${scheduledFor}`);
        return;
      }

      // Create new reminder (store resolvedAssignedTo)
      const reminder = await this.prisma.hRDReminder.create({
        data: {
          processingStepId,
          processingCandidateId,
          assignedTo: resolvedAssignedTo,
          scheduledFor,
          status: 'pending',
        },
      });

      const delayMs = Math.max(0, scheduledFor.getTime() - Date.now());
      await this.hrdQueue.add(
        'send-hrd-reminder',
        { reminderId: reminder.id, processingStepId, processingCandidateId, assignedTo: resolvedAssignedTo },
        { delay: delayMs, attempts: 3, removeOnComplete: true, removeOnFail: false },
      );

      this.logger.log(`Created HRD reminder ${reminder.id} for step ${processingStepId} at ${scheduledFor}`);
    } catch (error) {
      this.logger.error(`Failed to create HRD reminder for step ${processingStepId}:`, error);
    }
  }

  /**
   * Cancel HRD reminders for a given processing step (called when verified or step completed)
   */
  async cancelHRDRemindersForStep(processingStepId: string): Promise<void> {
    try {
      const reminders = await this.prisma.hRDReminder.findMany({ where: { processingStepId, status: { in: ['pending', 'sent'] } } });
      if (!reminders || reminders.length === 0) return;

      await this.prisma.hRDReminder.updateMany({
        where: { processingStepId, status: { in: ['pending', 'sent'] } },
        data: { status: 'completed', updatedAt: new Date() },
      });

      const jobs = await this.hrdQueue.getJobs(['waiting', 'delayed']);
      for (const job of jobs) {
        if (job.data.processingStepId === processingStepId) {
          await job.remove();
        }
      }

      this.logger.log(`Cancelled ${reminders.length} HRD reminder(s) for step ${processingStepId}`);
    } catch (error) {
      this.logger.error(`Failed to cancel HRD reminders for step ${processingStepId}:`, error);
    }
  }

  /**
   * Return HRD reminders assigned to the given user
   */
  async getMyReminders(userId: string, opts?: { dueOnly?: boolean }) {
    const now = new Date();
    const where: any = { assignedTo: userId, status: { in: ['pending', 'sent'] } };

    if (opts?.dueOnly) {
      // Return only reminders whose scheduledFor is now or in the past
      where.scheduledFor = { lte: now };
    }

    return this.prisma.hRDReminder.findMany({
      where,
      orderBy: { scheduledFor: 'asc' },
      include: {
        processingStep: {
          include: {
            processingCandidate: {
              include: {
                candidate: {
                  select: {
                    id: true,
                    email: true,
                    source: true,
                    dateOfBirth: true,
                    gender: true,
                    firstName: true,
                    lastName: true,
                    mobileNumber: true,
                    countryCode: true,
                  },
                },
                project: true,
                role: {
                  select: {
                    id: true,
                    projectId: true,
                    roleCatalogId: true,
                    designation: true,
                    roleCatalog: {
                      select: { id: true, roleDepartmentId: true, name: true, label: true, shortName: true },
                    },
                  },
                },
              },
            },
            template: true,
          },
        },
      },
    });
  }

  /**
   * Dismiss (cancel) a reminder for the assigned user
   */
  async dismissReminder(reminderId: string, userId: string) {
    const reminder = await this.prisma.hRDReminder.findUnique({ where: { id: reminderId } });
    if (!reminder) throw new NotFoundException('Reminder not found');
    // Only assigned user (or an admin) should dismiss; for now require assigned user
    if (reminder.assignedTo && reminder.assignedTo !== userId) {
      this.logger.warn(`User ${userId} attempted to dismiss reminder ${reminderId} assigned to ${reminder.assignedTo}`);
      throw new NotFoundException('Reminder not found');
    }

    await this.prisma.hRDReminder.update({ where: { id: reminderId }, data: { status: 'completed', updatedAt: new Date() } });

    // remove queued jobs if any
    const jobs = await this.hrdQueue.getJobs(['waiting', 'delayed']);
    for (const job of jobs) {
      if (job.data.reminderId === reminderId) await job.remove();
    }

    this.logger.log(`Dismissed HRD reminder ${reminderId} by user ${userId}`);
  }

  /**
   * Trigger an HRD reminder immediately for a step (manual trigger)
   */
  async triggerHRDReminderNow(processingStepId: string, triggeredBy?: string) {
    const step = await this.prisma.processingStep.findUnique({ where: { id: processingStepId }, include: { processingCandidate: true } });
    if (!step) throw new NotFoundException('Processing step not found');

    const processingCandidateId = step.processingCandidateId;
    const resolvedAssignedTo = step.assignedTo || (step.processingCandidate ? step.processingCandidate.assignedProcessingTeamUserId : null);

    const existing = await this.prisma.hRDReminder.findFirst({ where: { processingStepId }, orderBy: { updatedAt: 'desc' } });

    if (existing) {
      await this.prisma.hRDReminder.update({ where: { id: existing.id }, data: { assignedTo: resolvedAssignedTo, scheduledFor: new Date(), status: 'pending', updatedAt: new Date() } });

      const jobs = await this.hrdQueue.getJobs(['waiting', 'delayed']);
      for (const job of jobs) {
        if (job.data.reminderId === existing.id) await job.remove();
      }

      await this.hrdQueue.add('send-hrd-reminder', { reminderId: existing.id, processingStepId, processingCandidateId, assignedTo: resolvedAssignedTo }, { delay: 0, attempts: 3, removeOnComplete: true, removeOnFail: false });

      this.logger.log(`Triggered HRD reminder now for existing ${existing.id} on step ${processingStepId}`);
      return existing;
    }

    const reminder = await this.prisma.hRDReminder.create({ data: { processingStepId, processingCandidateId, assignedTo: resolvedAssignedTo, scheduledFor: new Date(), status: 'pending' } });

    await this.hrdQueue.add('send-hrd-reminder', { reminderId: reminder.id, processingStepId, processingCandidateId, assignedTo: resolvedAssignedTo }, { delay: 0, attempts: 3, removeOnComplete: true, removeOnFail: false });

    this.logger.log(`Triggered HRD reminder now for new ${reminder.id} on step ${processingStepId}`);
    return reminder;
  }
}

