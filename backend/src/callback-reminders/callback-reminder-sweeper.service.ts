import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CallbackRemindersService } from './callback-reminders.service';

@Injectable()
export class CallbackReminderSweeperService {
  private readonly logger = new Logger(CallbackReminderSweeperService.name);

  constructor(
    private readonly callbackRemindersService: CallbackRemindersService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async sweepDueCallbackReminders(): Promise<void> {
    try {
      const processed =
        await this.callbackRemindersService.processDueReminders();
      if (processed > 0) {
        this.logger.log(
          `Callback reminder sweeper re-queued ${processed} due reminder(s)`,
        );
      }
    } catch (error) {
      this.logger.error('Callback reminder sweeper failed:', error);
    }
  }
}
