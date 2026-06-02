import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../database/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CallbackRemindersService } from './callback-reminders.service';
import { CallbackRemindersController } from './callback-reminders.controller';
import { CallbackReminderProcessor } from '../jobs/callback-reminder.processor';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    NotificationsModule,
    BullModule.registerQueue({
      name: 'callback-reminders',
    }),
  ],
  controllers: [CallbackRemindersController],
  providers: [CallbackRemindersService, CallbackReminderProcessor],
  exports: [CallbackRemindersService],
})
export class CallbackRemindersModule {}
