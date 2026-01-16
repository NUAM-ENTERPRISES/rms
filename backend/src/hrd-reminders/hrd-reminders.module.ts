import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../database/prisma.module';
import { SystemConfigModule } from '../system-config/system-config.module';
import { ProcessingModule } from '../processing/processing.module';
import { HrdRemindersService } from './hrd-reminders.service';
import { HrdReminderProcessor } from '../jobs/hrd-reminder.processor';
import { HrdRemindersController } from './hrd-reminders.controller';

@Module({
  imports: [
    PrismaModule,
    SystemConfigModule,
    forwardRef(() => ProcessingModule),
    // Notifications (for socket emits)
    forwardRef(() => require('../notifications/notifications.module').NotificationsModule),
    // Register BullMQ queue
    BullModule.registerQueue({ name: 'hrd-reminders' }),
  ],
  controllers: [HrdRemindersController],
  providers: [HrdRemindersService, HrdReminderProcessor],
  exports: [HrdRemindersService],
})
export class HrdRemindersModule {}
