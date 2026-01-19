import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../database/prisma.module';
import { SystemConfigModule } from '../system-config/system-config.module';
import { ProcessingModule } from '../processing/processing.module';
import { DataFlowRemindersService } from './data-flow-reminders.service';
import { DataFlowReminderProcessor } from '../jobs/data-flow-reminder.processor';
import { DataFlowRemindersController } from './data-flow-reminders.controller';

@Module({
  imports: [
    PrismaModule,
    SystemConfigModule,
    forwardRef(() => ProcessingModule),
    // Notifications (for socket emits)
    forwardRef(() => require('../notifications/notifications.module').NotificationsModule),
    // Register BullMQ queue
    BullModule.registerQueue({ name: 'data-flow-reminders' }),
  ],
  controllers: [DataFlowRemindersController],
  providers: [DataFlowRemindersService, DataFlowReminderProcessor],
  exports: [DataFlowRemindersService],
})
export class DataFlowRemindersModule {}
