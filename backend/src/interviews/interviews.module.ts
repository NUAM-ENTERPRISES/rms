import { Module } from '@nestjs/common';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';
import { InterviewReminderService } from './interview-reminder.service';
import { PrismaModule } from '../database/prisma.module';
import { CandidateProjectsModule } from '../candidate-projects/candidate-projects.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, CandidateProjectsModule, NotificationsModule],
  controllers: [InterviewsController],
  providers: [InterviewsService, InterviewReminderService],
  exports: [InterviewsService],
})
export class InterviewsModule {}
