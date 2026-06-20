import { Module, forwardRef } from '@nestjs/common';
import { ProcessingController } from './processing.controller';
import { ProcessingService } from './processing.service';
import { PrismaModule } from '../database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProcessingRemindersModule } from '../processing-reminders/processing-reminders.module';
import { CandidateProjectsModule } from '../candidate-projects/candidate-projects.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AuthModule),
    forwardRef(() => NotificationsModule),
    ProcessingRemindersModule,
    forwardRef(() => CandidateProjectsModule),
  ],
  controllers: [ProcessingController],
  providers: [ProcessingService],
  exports: [ProcessingService],
})
export class ProcessingModule {}
