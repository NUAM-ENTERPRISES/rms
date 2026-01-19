import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { SystemConfigService, HRDSettings } from '../system-config/system-config.service';

// Reuse HRDSettings shape for Data Flow settings
export type DataFlowSettings = HRDSettings;

@Injectable()
export class DataFlowRemindersService {
  private readonly logger = new Logger(DataFlowRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('data-flow-reminders') private readonly dataFlowQueue: Queue,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  async createDataFlowReminder(
    processingStepId: string,
    processingCandidateId: string,
    assignedTo: string | null,
    submittedAt?: Date,
  ): Promise<void> {
    try {
      const settings: DataFlowSettings = await this.systemConfigService.getDataFlowSettings();

      this.logger.log(`Creating Data Flow reminder: step=${processingStepId}, submittedAt=${submittedAt ?? 'now'}, settings=${JSON.stringify(settings)}`);

      let resolvedAssignedTo = assignedTo || null;
      if (!resolvedAssignedTo) {
        const stepInfo = await this.prisma.processingStep.findUnique({ where: { id: processingStepId }, include: { processingCandidate: true } });
        if (stepInfo) {
          resolvedAssignedTo = stepInfo.assignedTo || (stepInfo.processingCandidate ? (stepInfo.processingCandidate.assignedProcessingTeamUserId || null) : null);
        }
      }

      const base = submittedAt ? new Date(submittedAt) : new Date();
      const targetDate = new Date(base.getTime() + settings.daysAfterSubmission * 24 * 60 * 60 * 1000);

      const dailyTimes = (settings.dailyTimes && settings.dailyTimes.length > 0) ? settings.dailyTimes : ['09:00'];
      const allowedTimes = dailyTimes.slice(0, settings.remindersPerDay || dailyTimes.length);

      const combineDateTime = (date: Date, time: string) => {
        const [h, m] = time.split(':').map((x) => parseInt(x, 10));
        const d = new Date(date);
        d.setHours(Number.isNaN(h) ? 9 : h, Number.isNaN(m) ? 0 : m, 0, 0);
        return d;
      };

      let scheduledFor = combineDateTime(targetDate, allowedTimes[0]);
      const now = new Date();
      if (scheduledFor.getTime() < Date.now() && settings.daysAfterSubmission === 0) {
        const nextToday = allowedTimes.map((t) => combineDateTime(targetDate, t)).find((dt) => dt.getTime() > now.getTime());
        if (nextToday) scheduledFor = nextToday;
        else scheduledFor = combineDateTime(new Date(targetDate.getTime() + 24 * 60 * 60 * 1000), allowedTimes[0]);
      }

      if (settings.testMode?.enabled) {
        const delayMinutes = settings.testMode.immediateDelayMinutes ?? 1;
        scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000);
        this.logger.log(`[TEST MODE] Forcing Data Flow reminder for step ${processingStepId} to run at ${scheduledFor.toISOString()} (in ${delayMinutes} minutes)`);
      }

      const existing = await this.prisma.dataFlowReminder.findFirst({ where: { processingStepId }, orderBy: { updatedAt: 'desc' } });

      if (existing) {
        await this.prisma.dataFlowReminder.update({ where: { id: existing.id }, data: { processingCandidateId, assignedTo: resolvedAssignedTo, scheduledFor, status: 'pending', reminderCount: 0, dailyCount: 0, daysCompleted: 0, lastReminderDate: new Date(), updatedAt: new Date() } });

        const jobs = await this.dataFlowQueue.getJobs(['waiting', 'delayed']);
        for (const job of jobs) {
          if (job.data.reminderId === existing.id) await job.remove();
        }

        const delayMs = Math.max(0, scheduledFor.getTime() - Date.now());
        await this.dataFlowQueue.add('send-data-flow-reminder', { reminderId: existing.id, processingStepId, processingCandidateId, assignedTo: resolvedAssignedTo }, { delay: delayMs, attempts: 3, removeOnComplete: true, removeOnFail: false });

        this.logger.log(`Reset Data Flow reminder ${existing.id} for step ${processingStepId} scheduled at ${scheduledFor}`);
        return;
      }

      const reminder = await this.prisma.dataFlowReminder.create({ data: { processingStepId, processingCandidateId, assignedTo: resolvedAssignedTo, scheduledFor, status: 'pending' } });

      const delayMs = Math.max(0, scheduledFor.getTime() - Date.now());
      await this.dataFlowQueue.add('send-data-flow-reminder', { reminderId: reminder.id, processingStepId, processingCandidateId, assignedTo: resolvedAssignedTo }, { delay: delayMs, attempts: 3, removeOnComplete: true, removeOnFail: false });

      this.logger.log(`Created Data Flow reminder ${reminder.id} for step ${processingStepId} at ${scheduledFor}`);
    } catch (error) {
      this.logger.error(`Failed to create Data Flow reminder for step ${processingStepId}:`, error);
    }
  }

  async cancelDataFlowRemindersForStep(processingStepId: string): Promise<void> {
    try {
      const reminders = await this.prisma.dataFlowReminder.findMany({ where: { processingStepId, status: { in: ['pending', 'sent'] } } });
      if (!reminders || reminders.length === 0) return;

      await this.prisma.dataFlowReminder.updateMany({ where: { processingStepId, status: { in: ['pending', 'sent'] } }, data: { status: 'completed', updatedAt: new Date() } });

      const jobs = await this.dataFlowQueue.getJobs(['waiting', 'delayed']);
      for (const job of jobs) {
        if (job.data.processingStepId === processingStepId) await job.remove();
      }

      this.logger.log(`Cancelled ${reminders.length} Data Flow reminder(s) for step ${processingStepId}`);
    } catch (error) {
      this.logger.error(`Failed to cancel Data Flow reminders for step ${processingStepId}:`, error);
    }
  }

  async getMyReminders(userId: string, opts?: { sentOnly?: boolean; page?: number; limit?: number }) {
    const where: any = { assignedTo: userId, status: { in: ['pending', 'sent'] } };

    // When requested, return only reminders that have been sent (sentAt != null)
    if (opts?.sentOnly) {
      where.sentAt = { not: null };
    }

    const page = opts?.page && opts.page > 0 ? opts.page : 1;
    const limit = opts?.limit && opts.limit > 0 ? Math.min(100, opts.limit) : 20;
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.prisma.dataFlowReminder.count({ where }),
      this.prisma.dataFlowReminder.findMany({
        where,
        orderBy: { scheduledFor: 'asc' },
        skip,
        take: limit,
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
                        select: {
                          id: true,
                          roleDepartmentId: true,
                          name: true,
                          label: true,
                          shortName: true,
                        },
                      },
                    },
                  },
                },
              },
              template: true,
            },
          },
        },
      }),
    ]);

    return { items, total };
  }

  async dismissReminder(reminderId: string, userId: string) {
    const reminder = await this.prisma.dataFlowReminder.findUnique({ where: { id: reminderId } });
    if (!reminder) throw new NotFoundException('Reminder not found');
    if (reminder.assignedTo && reminder.assignedTo !== userId) {
      this.logger.warn(`User ${userId} attempted to dismiss reminder ${reminderId} assigned to ${reminder.assignedTo}`);
      throw new NotFoundException('Reminder not found');
    }

    await this.prisma.dataFlowReminder.update({ where: { id: reminderId }, data: { status: 'completed', updatedAt: new Date() } });

    const jobs = await this.dataFlowQueue.getJobs(['waiting', 'delayed']);
    for (const job of jobs) {
      if (job.data.reminderId === reminderId) await job.remove();
    }

    this.logger.log(`Dismissed Data Flow reminder ${reminderId} by user ${userId}`);
  }

  async triggerDataFlowReminderNow(processingStepId: string, triggeredBy?: string) {
    const step = await this.prisma.processingStep.findUnique({ where: { id: processingStepId }, include: { processingCandidate: true } });
    if (!step) throw new NotFoundException('Processing step not found');

    const processingCandidateId = step.processingCandidateId;
    const resolvedAssignedTo = step.assignedTo || (step.processingCandidate ? step.processingCandidate.assignedProcessingTeamUserId : null);

    const existing = await this.prisma.dataFlowReminder.findFirst({ where: { processingStepId }, orderBy: { updatedAt: 'desc' } });

    if (existing) {
      await this.prisma.dataFlowReminder.update({ where: { id: existing.id }, data: { assignedTo: resolvedAssignedTo, scheduledFor: new Date(), status: 'pending', updatedAt: new Date() } });

      const jobs = await this.dataFlowQueue.getJobs(['waiting', 'delayed']);
      for (const job of jobs) {
        if (job.data.reminderId === existing.id) await job.remove();
      }

      await this.dataFlowQueue.add('send-data-flow-reminder', { reminderId: existing.id, processingStepId, processingCandidateId, assignedTo: resolvedAssignedTo }, { delay: 0, attempts: 3, removeOnComplete: true, removeOnFail: false });

      this.logger.log(`Triggered Data Flow reminder now for existing ${existing.id} on step ${processingStepId}`);
      return existing;
    }

    const reminder = await this.prisma.dataFlowReminder.create({ data: { processingStepId, processingCandidateId, assignedTo: resolvedAssignedTo, scheduledFor: new Date(), status: 'pending' } });

    await this.dataFlowQueue.add('send-data-flow-reminder', { reminderId: reminder.id, processingStepId, processingCandidateId, assignedTo: resolvedAssignedTo }, { delay: 0, attempts: 3, removeOnComplete: true, removeOnFail: false });

    this.logger.log(`Triggered Data Flow reminder now for new ${reminder.id} on step ${processingStepId}`);
    return reminder;
  }
}
