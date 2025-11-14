import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RnrRemindersService } from './rnr-reminders.service';
import { RnrRemindersController } from './rnr-reminders.controller';
import { RnrReminderProcessor } from '../jobs/rnr-reminder.processor';
import { PrismaModule } from '../database/prisma.module';
import { SystemConfigModule } from '../system-config/system-config.module';
import { CandidatesModule } from '../candidates/candidates.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    SystemConfigModule, // Import SystemConfig for RNR settings
    forwardRef(() => CandidatesModule), // Import for RecruiterAssignmentService (avoid circular dependency)
    // Register BullMQ for RNR reminders
    BullModule.registerQueue({
      name: 'rnr-reminders',
    }),
  ],
  controllers: [RnrRemindersController],
  providers: [
    RnrRemindersService,
    RnrReminderProcessor, // Register the job processor
  ],
  exports: [RnrRemindersService], // Export so candidates.service can use it
})
export class RnrRemindersModule {}
