import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { SystemConfigService } from '../system-config/system-config.service';

@Injectable()
export class RnrRemindersService {
  private readonly logger = new Logger(RnrRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('rnr-reminders') private readonly rnrQueue: Queue,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  /**
   * STEP 1: Create a reminder when candidate status changes to RNR
   * This is called from candidates.service.ts when status = 8 (RNR)
   * 
   * MULTI-DAY LOGIC:
   * - If existing reminder found → RESET it to start fresh
   * - Will send 2 reminders per day for 3 consecutive days
   * - After 3 days (6 total reminders), auto-assign to CRE if still in RNR
   * 
   * Configuration comes from SystemConfig (database)
   */
  async createRNRReminder(
    candidateId: string,
    recruiterId: string,
    statusHistoryId: string,
  ): Promise<void> {
    try {
      // Get RNR settings from system config
      const settings = await this.systemConfigService.getRNRSettings();
      
      // Check if there's already a reminder for this candidate (any status except cancelled)
      const existingReminder = await this.prisma.rNRReminder.findFirst({
        where: {
          candidateId,
          status: {
            in: ['pending', 'sent', 'completed'], // Check all statuses except cancelled
          },
        },
        orderBy: {
          updatedAt: 'desc', // Get most recent
        },
      });

      // If existing reminder found, RESET it instead of creating new one
      if (existingReminder) {
        this.logger.log(
          `Found existing RNR reminder for candidate ${candidateId} (ID: ${existingReminder.id}). RESETTING for fresh ${settings.totalDays}-day cycle.`,
        );

        // Calculate new schedule time based on config
        const scheduledFor = new Date();
        const delayInMs = settings.delayBetweenReminders * 60 * 1000; // Convert minutes to ms
        scheduledFor.setMinutes(scheduledFor.getMinutes() + settings.delayBetweenReminders);

        // RESET the existing reminder to start fresh multi-day cycle
        this.logger.log(
          `[RESET] Old statusHistoryId: ${existingReminder.statusHistoryId}, New statusHistoryId: ${statusHistoryId}`,
        );
        
        await this.prisma.rNRReminder.update({
          where: { id: existingReminder.id },
          data: {
            statusHistoryId, // Update to NEW status history (latest RNR change)
            recruiterId, // Update recruiter (might have changed)
            scheduledFor,
            sentAt: null, // Reset sent time
            reminderCount: 0, // Reset total count
            dailyCount: 0, // Reset daily count
            daysCompleted: 0, // Reset days completed (IMPORTANT!)
            lastReminderDate: new Date(),
            status: 'pending', // Set back to pending
            creAssigned: false, // Reset CRE assignment
            creAssignedAt: null,
            creAssignedTo: null,
            updatedAt: new Date(),
          },
        });

        // Remove any pending jobs for this reminder from queue
        const jobs = await this.rnrQueue.getJobs(['waiting', 'delayed']);
        for (const job of jobs) {
          if (job.data.reminderId === existingReminder.id) {
            await job.remove();
            this.logger.log(`Removed old job ${job.id} for reminder ${existingReminder.id}`);
          }
        }

        // Add new job to queue
        await this.rnrQueue.add(
          'send-rnr-reminder',
          {
            reminderId: existingReminder.id,
            candidateId,
            recruiterId,
            statusHistoryId,
            reminderCount: 1,
          },
          {
            delay: delayInMs,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            removeOnComplete: true,
            removeOnFail: false,
          },
        );

        this.logger.log(
          `RESET existing RNR reminder ${existingReminder.id} for candidate ${candidateId}. Starting fresh ${settings.totalDays}-day cycle (${settings.remindersPerDay} reminders/day).`,
        );
        return; // Exit after resetting
      }

      // No existing reminder found - Create NEW one
      this.logger.log(
        `No existing reminder found. Creating NEW RNR reminder for candidate ${candidateId}.`,
      );

      // Calculate when to send first reminder based on config
      const scheduledFor = new Date();
      const delayInMs = settings.delayBetweenReminders * 60 * 1000; // Convert minutes to ms
      scheduledFor.setMinutes(scheduledFor.getMinutes() + settings.delayBetweenReminders);

      // Create the reminder in database
      const reminder = await this.prisma.rNRReminder.create({
        data: {
          candidateId,
          recruiterId,
          statusHistoryId,
          scheduledFor,
          reminderCount: 0, // Start at 0, will increment with each reminder
          dailyCount: 0, // Start at 0, resets each day
          daysCompleted: 0, // Start at 0, track which day we're on (0-3)
          lastReminderDate: new Date(),
          status: 'pending',
          creAssigned: false,
        },
      });

      // Add job to BullMQ queue with delay
      await this.rnrQueue.add(
        'send-rnr-reminder',
        {
          reminderId: reminder.id,
          candidateId,
          recruiterId,
          statusHistoryId,
          reminderCount: 1,
        },
        {
          delay: delayInMs,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      this.logger.log(
        `Created NEW RNR reminder for candidate ${candidateId}. Will send ${settings.remindersPerDay} reminders/day for ${settings.totalDays} days. First reminder at ${scheduledFor}.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create RNR reminder for candidate ${candidateId}:`,
        error,
      );
    }
  }

  /**
   * STEP 2: Complete reminders when status changes from RNR
   * This is called from candidates.service.ts when status changes away from RNR
   * Marks as 'completed' (recruiter successfully handled the candidate)
   * Also removes pending jobs from the queue
   */
  async cancelRNRReminders(candidateId: string): Promise<void> {
    try {
      // Find all active reminders for this candidate (pending or sent)
      const reminders = await this.prisma.rNRReminder.findMany({
        where: {
          candidateId,
          status: {
            in: ['pending', 'sent'], // Include both pending and sent
          },
        },
      });

      // Update database status to 'completed' (successfully handled by recruiter)
      await this.prisma.rNRReminder.updateMany({
        where: {
          candidateId,
          status: {
            in: ['pending', 'sent'], // Include both pending and sent
          },
        },
        data: {
          status: 'completed', // Changed from 'cancelled' to 'completed'
          updatedAt: new Date(),
        },
      });

      // Remove pending jobs from queue
      const jobs = await this.rnrQueue.getJobs(['waiting', 'delayed']);
      for (const job of jobs) {
        if (job.data.candidateId === candidateId) {
          await job.remove();
          this.logger.log(`Removed job ${job.id} for candidate ${candidateId}`);
        }
      }

      this.logger.log(
        `Completed ${reminders.length} RNR reminders for candidate ${candidateId} (status changed from RNR)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to complete RNR reminders for candidate ${candidateId}:`,
        error,
      );
    }
  }

  /**
   * STEP 3: Schedule the next reminder (now handled automatically by processor)
   * This method is no longer needed as the processor updates the same record
   * Kept for backward compatibility but can be removed
   */

  /**
   * STEP 7: Get active RNR reminders for a recruiter
   * This can be used to show a list in the frontend
   */
  async getRecruiterRNRReminders(recruiterId: string): Promise<any[]> {
    try {
      const reminders = await this.prisma.rNRReminder.findMany({
        where: {
          recruiterId,
          status: {
            in: ['pending', 'sent'],
          },
        },
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              countryCode: true,
              mobileNumber: true,
              currentStatus: {
                select: {
                  id: true,
                  statusName: true,
                },
              },
            },
          },
          statusHistory: {
            select: {
              statusUpdatedAt: true,
              reason: true,
            },
          },
        },
        orderBy: {
          scheduledFor: 'asc',
        },
      });

      return reminders;
    } catch (error) {
      this.logger.error(
        `Failed to get RNR reminders for recruiter ${recruiterId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * STEP 8: Manually dismiss a reminder
   * Recruiter can mark as handled
   */
  async dismissReminder(reminderId: string, recruiterId: string): Promise<void> {
    try {
      const reminder = await this.prisma.rNRReminder.findUnique({
        where: { id: reminderId },
      });

      if (!reminder) {
        throw new NotFoundException(`Reminder with ID ${reminderId} not found`);
      }

      // Verify the recruiter owns this reminder
      if (reminder.recruiterId !== recruiterId) {
        throw new Error('You can only dismiss your own reminders');
      }

      await this.prisma.rNRReminder.update({
        where: { id: reminderId },
        data: {
          status: 'cancelled',
        },
      });

      this.logger.log(
        `Recruiter ${recruiterId} dismissed reminder ${reminderId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to dismiss reminder ${reminderId}:`, error);
      throw error;
    }
  }
}
