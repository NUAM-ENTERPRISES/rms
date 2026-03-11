import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InterviewReminderService {
  private readonly logger = new Logger(InterviewReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly systemConfig: SystemConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Cron job to check and send interview reminders.
   * Runs every hour to check if it's one of the trigger times.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleInterviewReminders(overrideDays?: number) {
    const settings = await this.systemConfig.getInterviewReminderSettings();
    const currentHour = new Date().getHours();
    
    // Check if current hour is one of the scheduled reminder times
    // Logic: Start at 'startHour' (9 AM), then add 'intervalHours' (4h) for 'timesPerDay' (3)
    // Result: [9, 13, 17] (9 AM, 1 PM, 5 PM)
    const triggerHours: number[] = [];
    for (let i = 0; i < settings.timesPerDay; i++) {
        const hour = (settings.startHour + (i * settings.intervalHours)) % 24;
        triggerHours.push(hour);
    }

    // If current time doesn't match a trigger hour, stop unless manually forced via API
    if (!triggerHours.includes(currentHour) && overrideDays === undefined) {
      this.logger.debug(`Skipping reminder check at hour ${currentHour}. Scheduled triggers: ${triggerHours.join(', ')}`);
      return { skipped: true, currentHour, triggerHours };
    }

    this.logger.log(`Starting interview reminder check (Hour: ${currentHour})...`);
    const processedInterviews: any[] = [];

    try {
      const reminderDays = overrideDays !== undefined ? overrideDays : settings.daysBefore;
      
      // Calculate the target date (N days from now)
      const targetDateStart = new Date();
      targetDateStart.setDate(targetDateStart.getDate() + reminderDays);
      targetDateStart.setHours(0, 0, 0, 0);

      const targetDateEnd = new Date(targetDateStart);
      targetDateEnd.setHours(23, 59, 59, 999);

      this.logger.debug(`Checking for interviews between ${targetDateStart.toISOString()} and ${targetDateEnd.toISOString()}`);

      // Find interviews scheduled on the target date
      // We check for both client interviews (linked to project directly)
      // and interviews linked via candidateProjectMap
      const interviews = await this.prisma.interview.findMany({
        where: {
          scheduledTime: {
            gte: targetDateStart,
            lte: targetDateEnd,
          },
          OR: [
            { outcome: null },
            { outcome: 'pending' },
            { outcome: '' },
          ],
        },
        include: {
          project: {
            select: {
              id: true,
              title: true,
              team: {
                select: {
                  id: true,
                  leadId: true,
                  managerId: true,
                },
              },
            },
          },
          candidateProjectMap: {
            include: {
              candidate: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
              project: {
                select: {
                  id: true,
                  title: true,
                  team: {
                    select: {
                      id: true,
                      leadId: true,
                      managerId: true,
                    },
                  },
                },
              },
              recruiter: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });

      this.logger.log(`Found ${interviews.length} interviews for reminders.`);

      for (const interview of interviews) {
        const recipients = await this.sendRemindersForInterview(interview, currentHour);
        processedInterviews.push({
          interviewId: interview.id,
          candidate: interview.candidateProjectMap?.candidate?.firstName || 'Unknown',
          recipientsCount: recipients.length,
          recipients
        });
      }
      
      return {
        targetDate: targetDateStart.toISOString().split('T')[0],
        reminderDays,
        foundCount: interviews.length,
        processedInterviews,
        triggerHours
      };
    } catch (error) {
      this.logger.error('Error processing interview reminders:', error);
      throw error;
    }
  }

  private async sendRemindersForInterview(interview: any, currentHour: number) {
    const cpMap = interview.candidateProjectMap;
    // Allow notifications for interviews that may be linked only to a project
    const project = cpMap?.project || interview.project;
    
    const candidateName = cpMap?.candidate 
      ? `${cpMap.candidate.firstName} ${cpMap.candidate.lastName}` 
      : 'A candidate';
      
    const scheduledDate = new Date(interview.scheduledTime);
    
    // Manual date formatting to avoid date-fns dependency
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedDate = `${months[scheduledDate.getMonth()]} ${scheduledDate.getDate()}, ${scheduledDate.getFullYear()}`;
    const formattedTime = scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const interviewDate = `${formattedDate} at ${formattedTime}`;
    const message = `${candidateName} has scheduled interview at ${interviewDate} please remember`;
    const title = 'Interview Reminder';

    // Recipients
    const recipientIds = new Set<string>();

    // 1. Candidate's Assigned Recruiter
    if (cpMap?.recruiterId) {
      recipientIds.add(cpMap.recruiterId);
    }

    // 2. All Managers
    const managers = await this.prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: 'Manager',
            },
          },
        },
      },
      select: { id: true },
    });
    managers.forEach((manager) => recipientIds.add(manager.id));

    // 3. All Interview Coordinators
    const coordinators = await this.prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: 'Interview Coordinator',
            },
          },
        },
      },
      select: { id: true },
    });
    coordinators.forEach((coord) => recipientIds.add(coord.id));

    // 4. System Admins (Keeping this as safety/requirement)
    const admins = await this.prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: 'System Admin',
            },
          },
        },
      },
      select: { id: true },
    });
    admins.forEach((admin) => recipientIds.add(admin.id));

    const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const sentTo: string[] = [];
    for (const userId of recipientIds) {
      try {
        await this.notificationsService.createNotification({
          userId,
          type: 'INTERVIEW_REMINDER',
          title,
          message,
          link: `/interviews/${interview.id}`,
          // Include current hour in idempotency key so multiple reminders per day can be sent
          idemKey: `remind-itv-${interview.id}-${userId}-${todayStr}-h${currentHour}`,
        });
        sentTo.push(userId);
        this.logger.debug(`Sent reminder to user ${userId} for interview ${interview.id} at hour ${currentHour}`);
      } catch (err) {
        this.logger.error(`Failed to send reminder to user ${userId}:`, err);
      }
    }
    return sentTo;
  }
}
