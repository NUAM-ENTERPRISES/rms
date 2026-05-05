import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { SystemConfigService, ProcessingStepSettings } from '../system-config/system-config.service';

@Injectable()
export class ProcessingRemindersService {
  private readonly logger = new Logger(ProcessingRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('processing-reminders') private readonly remindersQueue: Queue,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  /**
   * Schedule or reschedule a reminder for a processing step based on its submittedAt date.
   */
  async scheduleReminder(processingStepId: string, userId: string): Promise<void> {
    try {
      const step = await this.prisma.processingStep.findUnique({
        where: { id: processingStepId },
        include: { template: true, processingCandidate: true },
      });

      if (!step || !step.submittedAt || step.status === 'completed' || step.status === 'cancelled') {
        await this.cancelReminder(processingStepId);
        return;
      }

      // 1. Get settings for this step type
      let settings: ProcessingStepSettings;
      if (step.template.key === 'hrd') {
        settings = await this.systemConfigService.getHRDSettings();
      } else if (step.template.key === 'data_flow') {
        settings = await this.systemConfigService.getDataFlowSettings();      } else if (step.template.key === 'medical' || step.template.key === 'medical_fitness') {
        settings = await this.systemConfigService.getMedicalSettings();
      } else if (step.template.key === 'biometrics') {
        settings = await this.systemConfigService.getBiometricSettings();
      } else if (step.template.key === 'emigration') {
        settings = await this.systemConfigService.getEmigrationSettings();
      } else if (step.template.key === 'document_received' || step.template.key === 'council_registration') {
        settings = await this.systemConfigService.getDocumentReceivedSettings();      } else {
        // Log skip if no settings for this step type yet
        this.logger.debug(`No reminder settings for step type: ${step.template.key}. Skipping.`);
        return;
      }

      // 2. Cancel existing jobs for this step
      await this.cancelReminder(processingStepId);

      // 3. Calculate scheduled time
      let scheduledFor: Date;
      if (settings.testMode?.enabled) {
        scheduledFor = new Date(Date.now() + (settings.testMode.immediateDelayMinutes || 1) * 60 * 1000);
      } else {
        const base = new Date(step.submittedAt);
        scheduledFor = new Date(base.getTime() + settings.daysAfterSubmission * 24 * 60 * 60 * 1000);
        
        // Ensure it runs at the daily time (defaulting to first configured time)
        if (settings.dailyTimes && settings.dailyTimes.length > 0) {
          const [h, m] = settings.dailyTimes[0].split(':').map((x) => parseInt(x, 10));
          scheduledFor.setHours(h || 9, m || 0, 0, 0);
        }
      }

      const delay = Math.max(0, scheduledFor.getTime() - Date.now());

      // 4. Upsert persistent reminder record
      await this.prisma.processingStepReminder.upsert({
        where: { id: `rem:${processingStepId}` }, // Static ID mapping or use processingStepId with unique constraint
        update: {
          scheduledFor,
          status: 'pending',
          assignedTo: userId,
        },
        create: {
          id: `rem:${processingStepId}`,
          stepKey: step.template.key,
          processingStepId,
          processingCandidateId: step.processingCandidateId,
          assignedTo: userId,
          scheduledFor,
          status: 'pending',
        },
      });

      // 5. Add job to unified queue
      await this.remindersQueue.add(
        'process-step-reminder',
        {
          processingStepId,
          stepKey: step.template.key,
          userId,
        },
        {
          jobId: `reminder:${processingStepId}`, // Enforce uniqueness per step
          delay,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      this.logger.log(`Scheduled ${step.template.key} reminder for step ${processingStepId} at ${scheduledFor.toISOString()}`);
    } catch (error) {
      this.logger.error(`Failed to schedule reminder for step ${processingStepId}:`, error);
    }
  }

  /**
   * Cancel any pending reminder for a step
   */
  async cancelReminder(processingStepId: string): Promise<void> {
    const job = await this.remindersQueue.getJob(`reminder:${processingStepId}`);
    if (job) {
      await job.remove();
      this.logger.debug(`Cancelled pending reminder job for step ${processingStepId}`);
    }

    // Mark as cancelled in DB ONLY if it wasn't already sent or completed
    await this.prisma.processingStepReminder.updateMany({
      where: { 
        processingStepId, 
        status: { in: ['pending'] } 
      },
      data: { status: 'cancelled' },
    });
  }
}
