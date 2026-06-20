import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CallbackRemindersService } from './callback-reminders.service';
import { CallbackRemindersController } from './callback-reminders.controller';
import { CallbackReminderProcessor } from '../jobs/callback-reminder.processor';
import { CallbackReminderSweeperService } from './callback-reminder-sweeper.service';
import { PrismaModule } from '../database/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    BullModule.registerQueue({
      name: 'callback-reminders',
    }),
  ],
  controllers: [CallbackRemindersController],
  providers: [
    CallbackRemindersService,
    CallbackReminderProcessor,
    CallbackReminderSweeperService,
  ],
  exports: [CallbackRemindersService],
})
export class CallbackRemindersModule {}
