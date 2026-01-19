import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { SystemConfigService, HRDSettings } from '../system-config/system-config.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Processor('data-flow-reminders')
export class DataFlowReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(DataFlowReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('data-flow-reminders') private readonly dataFlowQueue: Queue,
    private readonly systemConfigService: SystemConfigService,
    @Inject(forwardRef(() => NotificationsGateway)) private readonly notificationsGateway: NotificationsGateway,
  ) {
    super();
    this.logger.log('✅ DataFlowReminderProcessor initialized');
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { reminderId, processingStepId, processingCandidateId, assignedTo } = job.data;
    this.logger.log(`Processing Data Flow reminder job ${job.id} for step ${processingStepId}`);

    try {
      const settings: HRDSettings = await this.systemConfigService.getDataFlowSettings();
      this.logger.log(`Processing Data Flow reminder job ${job.id} for step ${processingStepId} (reminderId=${reminderId})`);
      this.logger.debug(`Data Flow settings: ${JSON.stringify(settings)}`);

      const reminder = await this.prisma.dataFlowReminder.findUnique({ where: { id: reminderId }, include: { processingStep: { include: { template: true, documents: { include: { candidateProjectDocumentVerification: true } } } }, processingCandidate: { include: { candidate: true, project: true } } } });

      if (!reminder || reminder.status === 'cancelled' || reminder.status === 'completed') {
        this.logger.log(`Reminder ${reminderId} missing or already completed/cancelled. Skipping.`);
        return { success: false, reason: 'missing or already processed' };
      }

      this.logger.log(`Reminder record: id=${reminder.id}, scheduledFor=${reminder.scheduledFor?.toISOString()}, reminderCount=${reminder.reminderCount}, dailyCount=${reminder.dailyCount}, daysCompleted=${reminder.daysCompleted}`);

      const step = await this.prisma.processingStep.findUnique({ where: { id: processingStepId }, include: { template: true, documents: { include: { candidateProjectDocumentVerification: true } } } });

      if (!step) {
        this.logger.warn(`Processing step ${processingStepId} not found. Marking reminder as completed.`);
        await this.prisma.dataFlowReminder.update({ where: { id: reminderId }, data: { status: 'completed' } });
        return { success: false, reason: 'step not found' };
      }

      if (step.status === 'completed' || step.status === 'cancelled') {
        this.logger.log(`Data Flow step ${processingStepId} status is '${step.status}'. Cancelling reminder ${reminderId}`);
        await this.prisma.dataFlowReminder.update({ where: { id: reminderId }, data: { status: 'completed' } });
        return { success: false, reason: 'step completed or cancelled' };
      }

      if (!step.submittedAt) {
        this.logger.log(`Data Flow step ${processingStepId} has no submittedAt. Cancelling reminder ${reminderId}`);
        await this.prisma.dataFlowReminder.update({ where: { id: reminderId }, data: { status: 'completed' } });
        return { success: false, reason: 'no submittedAt' };
      }

      let finalAssignedTo = assignedTo || reminder.assignedTo || step.assignedTo || (reminder.processingCandidate ? (reminder.processingCandidate.assignedProcessingTeamUserId || null) : null);

      if (!finalAssignedTo) {
        this.logger.warn(`No assigned processing user for step ${processingStepId}. Cannot send Data Flow reminder.`);
      } else {
        const candidate = reminder.processingCandidate?.candidate;
        const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Candidate';
        const projectName = (reminder.processingCandidate && (reminder.processingCandidate as any).project && (reminder.processingCandidate as any).project.name) ? (reminder.processingCandidate as any).project.name : 'Project';

        const submittedAtISO = step.submittedAt ? new Date(step.submittedAt).toISOString() : null;
        const submittedAtFormatted = submittedAtISO ? submittedAtISO.slice(0, 19).replace('T', ' ') : 'unknown';

        await this.prisma.notification.create({ data: { userId: finalAssignedTo, type: 'DATA_FLOW_REMINDER', title: `Data Flow Follow-up required for ${candidateName}`, message: `Data Flow step for ${candidateName} was submitted on ${submittedAtFormatted} and is not yet processed. Please follow up.`, link: `/processingCandidateDetails/${processingCandidateId}`, status: 'unread', idemKey: `data_flow_reminder_${reminderId}_${Date.now()}`, meta: { processingStepId, processingCandidateId, reminderId, submittedAt: submittedAtISO }, } });

        const updatedReminder = await this.prisma.dataFlowReminder.update({ where: { id: reminderId }, data: { status: 'sent', sentAt: new Date(), reminderCount: reminder.reminderCount + 1, dailyCount: reminder.dailyCount + 1, lastReminderDate: new Date(), assignedTo: finalAssignedTo, } });

        this.logger.log(`Sent Data Flow reminder ${reminderId} to user ${finalAssignedTo}`);

        try {
          const payload = { type: 'dataFlowReminder.sent', payload: { reminder: updatedReminder, reminderId: updatedReminder.id, stepId: updatedReminder.processingStepId, processingId: updatedReminder.processingCandidateId, scheduledFor: updatedReminder.scheduledFor, sentAt: updatedReminder.sentAt, assignedToId: updatedReminder.assignedTo, submittedAt: step.submittedAt ? new Date(step.submittedAt).toISOString() : null, title: 'Data Flow Reminder', body: `Please process Data Flow for ${candidateName} (${projectName})`, route: `/processingCandidateDetails/${updatedReminder.processingCandidateId}`, }, };

          await this.notificationsGateway.emitToUser(updatedReminder.assignedTo!, 'dataFlowReminder.sent', payload);
          this.logger.log(`Emitted dataFlowReminder.sent to user ${updatedReminder.assignedTo} for reminder ${updatedReminder.id}`);
        } catch (err) {
          this.logger.error(`Failed to emit dataFlowReminder.sent for reminder ${reminderId}: ${err.message}`, err.stack);
        }
      }

      const dailyTimes = (settings.dailyTimes && settings.dailyTimes.length > 0) ? settings.dailyTimes.slice(0, settings.remindersPerDay || settings.dailyTimes.length) : ['09:00'];

      const combine = (date: Date, hhmm: string) => {
        const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
        const d = new Date(date);
        d.setHours(Number.isNaN(h) ? 9 : h, Number.isNaN(m) ? 0 : m, 0, 0);
        return d;
      };

      const scheduledDate = new Date(reminder.scheduledFor);
      const now = new Date();

      const nextSameDay = dailyTimes.map((t) => combine(scheduledDate, t)).find((dt) => dt.getTime() > scheduledDate.getTime());

      let nextScheduledFor: Date | null = null;
      let newDaysCompleted = reminder.daysCompleted;
      let newDailyCount = reminder.dailyCount;

      if (nextSameDay) {
        nextScheduledFor = nextSameDay;
        newDailyCount = reminder.dailyCount + 1;
      } else {
        const nextDay = new Date(scheduledDate.getTime() + 24 * 60 * 60 * 1000);
        nextScheduledFor = combine(nextDay, dailyTimes[0]);
        newDaysCompleted = reminder.daysCompleted + 1;
        newDailyCount = 0;
      }

      if (newDaysCompleted < settings.totalDays) {
        await this.prisma.dataFlowReminder.update({ where: { id: reminderId }, data: { scheduledFor: nextScheduledFor, status: 'pending', daysCompleted: newDaysCompleted, dailyCount: newDailyCount } });

        const delayMs = Math.max(0, nextScheduledFor.getTime() - Date.now());
        await this.dataFlowQueue.add('send-data-flow-reminder', { reminderId, processingStepId, processingCandidateId, assignedTo }, { delay: delayMs, attempts: 3, removeOnComplete: true, removeOnFail: false });

        this.logger.log(`Scheduled follow-up reminder for ${reminderId} at ${nextScheduledFor}`);
      } else {
        await this.prisma.dataFlowReminder.update({ where: { id: reminderId }, data: { status: 'completed' } });
        this.logger.log(`Data Flow reminder ${reminderId} completed after reaching totalDays`);
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to process Data Flow reminder job ${job.id}:`, error);
      throw error;
    }
  }
}
