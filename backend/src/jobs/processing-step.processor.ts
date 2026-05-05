import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Processor('processing-reminders')
export class ProcessingStepProcessor extends WorkerHost {
  private readonly logger = new Logger(ProcessingStepProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly notificationsGateway: NotificationsGateway,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { processingStepId, stepKey, userId } = job.data;
    this.logger.log(`Processing ${stepKey} reminder for step ${processingStepId}`);

    try {
      const step = await this.prisma.processingStep.findUnique({
        where: { id: processingStepId },
        include: { 
          processingCandidate: { 
            include: { 
              candidate: true,
              project: true
            } 
          } 
        },
      });

      if (!step || !step.submittedAt || step.status === 'completed' || step.status === 'cancelled') {
        this.logger.debug(`Step ${processingStepId} no longer requires reminder. Skipping.`);
        return { success: false, reason: 'obsolete' };
      }

      const candidate = step.processingCandidate?.candidate;
      const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Candidate';
      const projectName = step.processingCandidate?.project?.title || 'Project';

      const typeLabel = stepKey.toUpperCase().replace('_', ' ');
      const title = `${typeLabel} Follow-up required`;
      const message = `${typeLabel} step for ${candidateName} (${projectName}) requires attention. Please follow up.`;

      // 1. Update Persistent Reminder Tracking
      await this.prisma.processingStepReminder.update({
        where: { id: `rem:${processingStepId}` }, // Matches the manual ID from service
        data: {
          sentAt: new Date(),
          status: 'sent',
          reminderCount: { increment: 1 },
          lastReminderDate: new Date(),
          dailyCount: { increment: 1 },
        },
      });

      // 2. Create Database Notification
      const notification = await this.prisma.notification.create({
        data: {
          type: `${stepKey.toUpperCase()}_REMINDER`,
          title,
          message,
          link: `/processingCandidateDetails/${step.processingCandidateId}`,
          status: 'unread',
          meta: { processingStepId, processingCandidateId: step.processingCandidateId } as any,
          idemKey: `reminder:${processingStepId}:${Date.now()}`, 
          user: { connect: { id: userId } }
        } as any,
      });

      // 2. Real-time Socket.IO Emit
      try {
        const socketPayload = {
          ...notification,
          type: 'processing.reminder', // Ensure it matches frontend handler
          id: notification.id,
          title,
          message,
          meta: notification.meta,
          createdAt: notification.createdAt,
          isSilent: true, // Mark as silent so the bell icon doesn't react
        };

        // Emit to the generic notification:new event for data refresh, but it will be ignored by sound/toast/badge
        await this.notificationsGateway.emitToUser(userId, 'notification:new', socketPayload);
        
        // Also emit to the specific event for targeted listeners
        await this.notificationsGateway.emitToUser(userId, 'processing.reminder', socketPayload);
        
        this.logger.log(`Real-time reminder emitted to user ${userId} for step ${processingStepId}`);
      } catch (socketError) {
        this.logger.error(`Failed to emit real-time reminder: ${socketError.message}`);
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to process reminder job ${job.id}:`, error);
      throw error;
    }
  }
}
