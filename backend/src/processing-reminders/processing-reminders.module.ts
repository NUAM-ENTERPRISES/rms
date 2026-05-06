import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../database/prisma.module';
import { SystemConfigModule } from '../system-config/system-config.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProcessingRemindersService } from './processing-reminders.service';
import { ProcessingStepProcessor } from '../jobs/processing-step.processor';

@Module({
  imports: [
    PrismaModule,
    SystemConfigModule,
    forwardRef(() => NotificationsModule),
    BullModule.registerQueue({ name: 'processing-reminders' }),
  ],
  providers: [ProcessingRemindersService, ProcessingStepProcessor],
  exports: [ProcessingRemindersService],
})
export class ProcessingRemindersModule {}
