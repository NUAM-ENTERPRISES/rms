import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { SystemConfigService, RNRSettings } from '../system-config/system-config.service';
import { RecruiterAssignmentService } from '../candidates/services/recruiter-assignment.service';

/**
 * RNR Reminder Job Processor
 * Handles delayed jobs for RNR reminders with multi-day support
 * 
 * MULTI-DAY LOGIC:
 * - Sends 2 reminders per day for up to 3 days (configurable)
 * - Tracks days completed (0-3)
 * - After 3 days, assigns to CRE if still in RNR
 */
@Processor('rnr-reminders')
export class RnrReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(RnrReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('rnr-reminders') private readonly rnrQueue: Queue,
    private readonly systemConfigService: SystemConfigService,
    @Inject(forwardRef(() => RecruiterAssignmentService))
    private readonly recruiterAssignmentService: RecruiterAssignmentService,
  ) {
    super();
    this.logger.log('✅ RnrReminderProcessor initialized and ready to process jobs');
  }

  /**
   * Process a single RNR reminder job
   * This runs when the delayed job becomes active
   */
  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing RNR reminder job ${job.id} for candidate ${job.data.candidateId}`);

    try {
      const { reminderId, candidateId, recruiterId } = job.data;

      // Get RNR settings from config
      const settings = await this.systemConfigService.getRNRSettings();

      // Get the reminder from database
      const reminder = await this.prisma.rNRReminder.findUnique({
        where: { id: reminderId },
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              currentStatusId: true,
            },
          },
          recruiter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // If reminder was cancelled or doesn't exist, skip
      if (!reminder || reminder.status === 'cancelled' || reminder.status === 'completed') {
        this.logger.log(`Reminder ${reminderId} was cancelled/completed or not found. Skipping.`);
        return { success: false, reason: 'Reminder cancelled/completed or not found' };
      }

      // SPECIAL CASE: Check if this is a CRE assignment check (reminderCount = 999)
      if (job.data.reminderCount === 999) {
        this.logger.log(`[CRE ASSIGNMENT CHECK] Checking if candidate ${candidateId} needs CRE assignment after 3 days`);

        // Verify candidate is still in RNR
        if (reminder.candidate.currentStatusId !== 8) {
          this.logger.log(`[CRE ASSIGNMENT CHECK] Candidate no longer in RNR. Marking reminder as completed.`);
          await this.prisma.rNRReminder.update({
            where: { id: reminderId },
            data: { status: 'completed' },
          });
          return { success: false, reason: 'Candidate no longer in RNR' };
        }

        // Check if already has CRE assigned
        const hasActiveCRE = await this.prisma.candidateRecruiterAssignment.findFirst({
          where: {
            candidateId,
            isActive: true,
            recruiter: {
              userRoles: {
                some: {
                  role: {
                    name: 'CRE',
                  },
                },
              },
            },
          },
        });

        if (hasActiveCRE) {
          this.logger.log(`[CRE ASSIGNMENT CHECK] Candidate already has CRE assigned. Marking as completed.`);
          await this.prisma.rNRReminder.update({
            where: { id: reminderId },
            data: { status: 'completed' },
          });
          return { success: false, reason: 'CRE already assigned' };
        }

        // Proceed with CRE assignment
        await this.prisma.rNRReminder.update({
          where: { id: reminderId },
          data: { status: 'completed' },
        });

        if (settings.creAssignment.enabled) {
          await this.handleCREAssignment(candidateId, recruiterId, reminderId, settings);
        }

        return { success: true, reason: 'CRE assignment check completed' };
      }

      // CONDITION 1: Check if candidate is still in RNR status (statusId = 8)
      if (reminder.candidate.currentStatusId !== 8) {
        this.logger.log(
          `Candidate ${candidateId} is no longer in RNR status. Marking as completed.`,
        );
        await this.cancelReminder(reminderId);
        return { success: false, reason: 'Candidate no longer in RNR status' };
      }

      // CONDITION 2: Check if we've completed all 3 days already
      if (reminder.daysCompleted >= settings.totalDays) {
        this.logger.log(
          `[DEBUG] All ${settings.totalDays} days completed for candidate ${candidateId}. Checking if CRE assignment needed.`,
        );
        
        // Check if CRE assignment hasn't been done yet
        if (settings.creAssignment.enabled && !reminder.creAssigned) {
          await this.handleCREAssignment(candidateId, recruiterId, reminderId, settings);
        }
        
        await this.prisma.rNRReminder.update({
          where: { id: reminderId },
          data: { status: 'completed' },
        });
        return { success: false, reason: 'All days completed' };
      }

      // CONDITION 3: Check if we've already sent 2 reminders today
      this.logger.log(
        `[DEBUG] Current reminder state: daysCompleted=${reminder.daysCompleted}, dailyCount=${reminder.dailyCount}, reminderCount=${reminder.reminderCount}`,
      );
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastReminderDate = new Date(reminder.lastReminderDate);
      lastReminderDate.setHours(0, 0, 0, 0);

      // Check if this is a new day
      const isNewDay = lastReminderDate.getTime() !== today.getTime();

      // If it's a new day, reset dailyCount and increment daysCompleted
      let currentDaysCompleted = reminder.daysCompleted;
      let currentDailyCount = reminder.dailyCount;

      if (isNewDay && reminder.reminderCount > 0) {
        currentDaysCompleted = reminder.daysCompleted;
        currentDailyCount = 0;

        this.logger.log(
          `[DEBUG] NEW DAY detected! Using stored daysCompleted=${reminder.daysCompleted} and resetting dailyCount to 0`,
        );
      }

      currentDaysCompleted = Math.min(currentDaysCompleted, settings.totalDays);
      const currentDayNumber = Math.min(currentDaysCompleted + 1, settings.totalDays);

      // If last reminder was today and we've already sent 2, skip
      if (
        !isNewDay &&
        currentDailyCount >= settings.remindersPerDay
      ) {
        this.logger.log(
          `[DEBUG] STOPPING - Already sent ${settings.remindersPerDay} reminders today for candidate ${candidateId}. Skipping.`,
        );
        return { success: false, reason: 'Daily limit reached' };
      }

      // CONDITION 5: Send the notification
      await this.sendRNRNotification(reminder, currentDayNumber, currentDailyCount + 1);

      // CONDITION 6: Calculate the new counts
      const newDailyCount = currentDailyCount + 1;
      const newReminderCount = reminder.reminderCount + 1;
      const didCompleteDay = newDailyCount >= settings.remindersPerDay;
      const updatedDaysCompleted = didCompleteDay
        ? Math.min(currentDayNumber, settings.totalDays)
        : currentDaysCompleted;

      this.logger.log(
        `[DEBUG] Updating counts: daysCompleted=${updatedDaysCompleted}, dailyCount=${newDailyCount}, reminderCount=${newReminderCount}`,
      );

      // CONDITION 7: Update the SAME reminder record with new data
      this.logger.log(`[DEBUG] BEFORE UPDATE - Reminder ID: ${reminderId}`);
      const updateResult = await this.prisma.rNRReminder.update({
        where: { id: reminderId },
        data: {
          status: 'sent',
          sentAt: new Date(),
          reminderCount: newReminderCount,
          dailyCount: newDailyCount,
          daysCompleted: updatedDaysCompleted,
          lastReminderDate: new Date(),
        },
      });
      this.logger.log(`[DEBUG] AFTER UPDATE - Updated reminder:`, JSON.stringify({
        id: updateResult.id,
        reminderCount: updateResult.reminderCount,
        dailyCount: updateResult.dailyCount,
        daysCompleted: updateResult.daysCompleted,
      }));

      // CONDITION 8: Should we schedule another reminder?
      this.logger.log(
        `[DEBUG] newDailyCount = ${newDailyCount}, daysCompleted = ${updatedDaysCompleted}, checking if we should schedule next reminder...`,
      );
      
      if (newDailyCount < settings.remindersPerDay && currentDayNumber <= settings.totalDays) {
        this.logger.log(
          `[DEBUG] YES - Scheduling next reminder (${newDailyCount + 1}/${settings.remindersPerDay} for day ${currentDayNumber})`,
        );
        await this.scheduleNextReminderUpdate(
          reminderId,
          candidateId,
          recruiterId,
          reminder.statusHistoryId,
          {
            nextReminderNumber: newDailyCount + 1,
          },
        );
      } else if (updatedDaysCompleted < settings.totalDays) {
        this.logger.log(
          `[DEBUG] Daily limit reached for day ${currentDayNumber}. Scheduling next day start (total days ${settings.totalDays}).`,
        );
        const nextDayDelayMs = this.calculateNextDayDelayMs(settings);
        await this.scheduleNextReminderUpdate(
          reminderId,
          candidateId,
          recruiterId,
          reminder.statusHistoryId,
          {
            nextReminderNumber: 1,
            customDelayMs: nextDayDelayMs,
            force: true,
          },
        );
      } else if (updatedDaysCompleted >= settings.totalDays) {
        this.logger.log(
          `[DEBUG] Completed all ${settings.totalDays} days with all reminders sent. Scheduling CRE assignment check after delay.`,
        );

        // Schedule CRE assignment check after a delay (e.g., next day or configurable time)
        const creCheckDelayMs = this.calculateNextDayDelayMs(settings);
        await this.scheduleNextReminderUpdate(
          reminderId,
          candidateId,
          recruiterId,
          reminder.statusHistoryId,
          {
            nextReminderNumber: 999, // Special flag for CRE check
            customDelayMs: creCheckDelayMs,
            force: true,
          },
        );

        this.logger.log(
          `[DEBUG] CRE assignment check scheduled for next day. Candidate has received all ${newReminderCount} reminders.`,
        );
      }

      this.logger.log(`Successfully sent RNR reminder #${newReminderCount} (daily: ${newDailyCount}) for candidate ${candidateId}`);

      return {
        success: true,
        candidateId,
        recruiterId,
        sentAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to process RNR reminder job ${job.id}:`, error);
      throw error; // This will trigger retry if configured
    }
  }

  /**
   * Handle CRE Assignment after 3 days completed
   */
  private async handleCREAssignment(
    candidateId: string,
    originalRecruiterId: string,
    reminderId: string,
    settings: any,
  ): Promise<void> {
    try {
      this.logger.log(
        `[CRE ASSIGNMENT] Starting CRE assignment for candidate ${candidateId} after ${settings.totalDays} days in RNR`,
      );

      // Check if candidate is still in RNR status (statusId = 8)
      const candidate = await this.prisma.candidate.findUnique({
        where: { id: candidateId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          currentStatusId: true,
        },
      });

      if (!candidate) {
        this.logger.warn(`[CRE ASSIGNMENT] Candidate ${candidateId} not found`);
        return;
      }

      if (candidate.currentStatusId !== 8) {
        this.logger.log(
          `[CRE ASSIGNMENT] Candidate ${candidateId} is no longer in RNR status (current: ${candidate.currentStatusId}). Skipping CRE assignment.`,
        );
        return;
      }

      // Check if already has CRE assigned
      const hasActiveCRE = await this.prisma.candidateRecruiterAssignment.findFirst({
        where: {
          candidateId,
          isActive: true,
          recruiter: {
            userRoles: {
              some: {
                role: {
                  name: 'CRE',
                },
              },
            },
          },
        },
      });

      if (hasActiveCRE) {
        this.logger.log(
          `[CRE ASSIGNMENT] Candidate ${candidateId} already has CRE assigned. Skipping.`,
        );
        return;
      }

      // Assign CRE to candidate (pass original recruiter as assigner)
      const assignedCRE = await this.recruiterAssignmentService.assignCREToCandidate(
        candidateId,
        originalRecruiterId, // Use original recruiter who changed status to RNR
        `Automatic CRE assignment after ${settings.totalDays} days in RNR status`,
      );

      this.logger.log(
        `[CRE ASSIGNMENT] Successfully assigned CRE ${assignedCRE.name} (${assignedCRE.id}) to candidate ${candidateId}. Original recruiter: ${originalRecruiterId}`,
      );

      // Update reminder with CRE assignment info
      await this.prisma.rNRReminder.update({
        where: { id: reminderId },
        data: {
          creAssigned: true,
          creAssignedAt: new Date(),
          creAssignedTo: assignedCRE.id,
        },
      });

      // Send notifications
      await this.sendCREAssignmentNotifications(
        candidateId,
        candidate.firstName,
        candidate.lastName,
        originalRecruiterId,
        assignedCRE.id,
        assignedCRE.name,
        settings.totalDays,
      );

      this.logger.log(
        `[CRE ASSIGNMENT] Completed CRE assignment process for candidate ${candidateId}`,
      );
    } catch (error) {
      this.logger.error(
        `[CRE ASSIGNMENT] Failed to assign CRE for candidate ${candidateId}:`,
        error,
      );
      // Don't throw - we don't want to fail the reminder job if CRE assignment fails
    }
  }

  /**
   * Send notifications for CRE assignment
   */
  private async sendCREAssignmentNotifications(
    candidateId: string,
    candidateFirstName: string,
    candidateLastName: string,
    originalRecruiterId: string,
    creId: string,
    creName: string,
    daysInRNR: number,
  ): Promise<void> {
    const candidateName = `${candidateFirstName} ${candidateLastName}`;

    // Notification to CRE (new assignment)
    await this.prisma.notification.create({
      data: {
        userId: creId,
        type: 'CRE_ASSIGNMENT',
        title: 'New RNR Candidate Assigned',
        message: `You have been assigned to candidate ${candidateName} who has been in RNR status for ${daysInRNR} days. Please follow up.`,
        link: `/candidates/${candidateId}`,
        status: 'unread',
        idemKey: `cre_assignment_${candidateId}_${Date.now()}`,
        meta: {
          candidateId,
          candidateName,
          assignmentType: 'cre_auto',
          daysInRNR,
          originalRecruiterId,
        },
      },
    });

    // Notification to original recruiter (escalation notice)
    await this.prisma.notification.create({
      data: {
        userId: originalRecruiterId,
        type: 'RNR_ESCALATION',
        title: 'RNR Candidate Escalated to CRE',
        message: `Candidate ${candidateName} has been escalated to CRE team member ${creName} after ${daysInRNR} days in RNR status.`,
        link: `/candidates/${candidateId}`,
        status: 'unread',
        idemKey: `rnr_escalation_${candidateId}_${Date.now()}`,
        meta: {
          candidateId,
          candidateName,
          assignedCREId: creId,
          assignedCREName: creName,
          daysInRNR,
        },
      },
    });

    this.logger.log(
      `[CRE ASSIGNMENT] Sent notifications to CRE ${creId} and original recruiter ${originalRecruiterId}`,
    );
  }

  /**
   * Send notification to recruiter with day and reminder count
   */
  private async sendRNRNotification(reminder: any, dayNumber: number, reminderNumber: number): Promise<void> {
    const candidateName = `${reminder.candidate.firstName} ${reminder.candidate.lastName}`;

    await this.prisma.notification.create({
      data: {
        userId: reminder.recruiterId,
        type: 'RNR_REMINDER',
        title: `Follow-up Required - RNR Candidate (Day ${dayNumber}, Reminder ${reminderNumber})`,
        message: `Candidate ${candidateName} is still in RNR (Ring Not Response). Please try calling again. This is reminder ${reminderNumber} of 2 for day ${dayNumber}.`,
        link: `/candidates/${reminder.candidateId}`,
        status: 'unread',
        idemKey: `rnr_reminder_${reminder.id}_${Date.now()}`,
        meta: {
          candidateId: reminder.candidateId,
          candidateName: candidateName,
          reminderType: 'RNR',
          statusHistoryId: reminder.statusHistoryId,
          dayNumber: dayNumber,
          reminderNumber: reminderNumber,
        },
      },
    });

    this.logger.log(
      `Sent RNR notification to recruiter ${reminder.recruiterId} for candidate ${reminder.candidateId} (Day ${dayNumber}, Reminder ${reminderNumber})`,
    );
  }

  /**
   * Cancel a reminder
   */
  private async cancelReminder(reminderId: string): Promise<void> {
    await this.prisma.rNRReminder.update({
      where: { id: reminderId },
      data: { status: 'cancelled' },
    });
  }

  /**
   * Schedule the next reminder (if under daily limit)
   * UPDATE the same reminder record instead of creating new ones
   */
  private async scheduleNextReminderUpdate(
    reminderId: string,
    candidateId: string,
    recruiterId: string,
    statusHistoryId: string,
    options: ScheduleNextOptions,
  ): Promise<void> {
    try {
      // Get RNR settings from config
      const settings = await this.systemConfigService.getRNRSettings();

      if (!options.force && options.nextReminderNumber > settings.remindersPerDay) {
        this.logger.log(
          `Next reminder number (${options.nextReminderNumber}) exceeds daily limit (${settings.remindersPerDay}) for candidate ${candidateId}. Skipping schedule.`,
        );
        return;
      }

      const delayInMs = options.customDelayMs ?? settings.delayBetweenReminders * 60 * 1000;
      const scheduledFor = new Date(Date.now() + delayInMs);

      // UPDATE the same reminder record to pending status with new schedule time
      await this.prisma.rNRReminder.update({
        where: { id: reminderId },
        data: {
          scheduledFor,
          status: 'pending', // Set back to pending for next reminder
        },
      });

      // Add next reminder job to queue (same reminderId)
      await this.rnrQueue.add(
        'send-rnr-reminder',
        {
          reminderId, // Use the SAME reminder ID
          candidateId,
          recruiterId,
          statusHistoryId,
          reminderCount: options.nextReminderNumber,
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

      const delayMinutes = Math.max(1, Math.round(delayInMs / (60 * 1000)));
      this.logger.log(
        `Scheduled next reminder #${options.nextReminderNumber} for candidate ${candidateId} at ${scheduledFor} (delay: ${delayMinutes} minutes)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to schedule next reminder for candidate ${candidateId}:`,
        error,
      );
    }
  }

  private calculateNextDayDelayMs(settings: RNRSettings): number {
    const now = new Date();
    const officeHoursEnabled = settings.officeHours?.enabled !== false;

    const nextRun = new Date(now);
    nextRun.setDate(nextRun.getDate() + 1);

    if (officeHoursEnabled) {
      const officeStart = settings.officeHours?.start ?? '09:00';
      const [startHourStr = '09', startMinuteStr = '00'] = officeStart.split(':');
      const startHour = parseInt(startHourStr, 10);
      const startMinute = parseInt(startMinuteStr, 10);
      nextRun.setHours(Number.isNaN(startHour) ? 9 : startHour, Number.isNaN(startMinute) ? 0 : startMinute, 0, 0);
    } else {
      // No office-hour restriction -> resume right after midnight (00:01) of next day
      nextRun.setHours(0, 1, 0, 0);
    }

    const delay = nextRun.getTime() - now.getTime();
    return delay > 0 ? delay : 1000;
  }
}

interface ScheduleNextOptions {
  nextReminderNumber: number;
  customDelayMs?: number;
  force?: boolean;
}
