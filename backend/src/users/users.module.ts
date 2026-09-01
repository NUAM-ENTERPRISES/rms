import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { UsersController } from './users.controller';
import { RecruitersController } from './recruiters.controller';
import { UsersService } from './users.service';
import { SessionCleanupService } from './session-cleanup.service';
import { PrismaService } from '../database/prisma.service';
import { AuditModule } from '../common/audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { UploadModule } from '../upload/upload.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RecruiterAnalyticsModule } from '../analytics/recruiter/recruiter-analytics.module';
import { EmployeeCodeService } from './services/employee-code.service';
import { BACKFILL_UNASSIGNED_RECRUITER_QUEUE } from '../candidates/constants/recruiter-assignment-backfill';
import { CandidatesModule } from '../candidates/candidates.module';

@Module({
  imports: [
    AuditModule,
    AuthModule,
    UploadModule,
    forwardRef(() => NotificationsModule),
    RecruiterAnalyticsModule,
    BullModule.registerQueue({
      name: BACKFILL_UNASSIGNED_RECRUITER_QUEUE,
    }),
    forwardRef(() => CandidatesModule),
  ],
  controllers: [UsersController, RecruitersController],
  providers: [UsersService, SessionCleanupService, PrismaService, EmployeeCodeService],
  exports: [UsersService],
})
export class UsersModule {}
