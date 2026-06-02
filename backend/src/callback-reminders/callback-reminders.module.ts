import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../database/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CallbackRemindersService } from './callback-reminders.service';
import { CallbackReminderProcessor } from '../jobs/callback-reminder.processor';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    BullModule.registerQueue({ name: 'callback-reminders' }),
  ],
  providers: [CallbackRemindersService, CallbackReminderProcessor],
  exports: [CallbackRemindersService],
})
export class CallbackRemindersModule {}
