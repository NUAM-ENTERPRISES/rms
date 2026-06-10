import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import whatsappConfig from './config/whatsapp.config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './auth/rbac/permissions.guard';
import { PrismaModule } from './database/prisma.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { ProjectsModule } from './projects/projects.module';
import { CandidatesModule } from './candidates/candidates.module';
import { TeamsModule } from './teams/teams.module';
import { DocumentsModule } from './documents/documents.module';
import { CountriesModule } from './countries/countries.module';
import { RoleCatalogModule } from './role-catalog/role-catalog.module';
import { RoleDepartmentsModule } from './role-departments/role-departments.module';
import { QualificationsModule } from './qualifications/qualifications.module';
import { ProfessionTypesModule } from './profession-types/profession-types.module';
import { AuditModule } from './common/audit/audit.module';
import { AuditInterceptor } from './common/audit/audit.interceptor';
import { SystemModule } from './system/system.module';
import { UploadModule } from './upload/upload.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CandidateAllocationModule } from './candidate-allocation/candidate-allocation.module';
import { CandidateProjectStatusHistoryModule } from './candidate-project-status-history/candidate-project-status-history.module';

import { OtpService } from './otp/otp.service';
import { OtpModule } from './otp/otp.module';

import { CandidateEligibilityModule } from './candidate-eligibility/candidate-eligibility.module';
import { EligibilityModule } from './candidate-eligibility/eligibility.module';
import { InterviewsModule } from './interviews/interviews.module';
import { MetaModule } from './meta/meta.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CandidateStatusModule } from './candidate-status/candidate-status.module';
import { CandidateStatusHistoryModule } from './candidate-status-history/candidate-status-history.module';
import { RnrRemindersModule } from './rnr-reminders/rnr-reminders.module';
import { CallbackRemindersModule } from './callback-reminders/callback-reminders.module';
import { SystemConfigModule } from './system-config/system-config.module';
import { CandidateProjectStatusModule } from './candidate-project-status/candidate-project-status.module';
import { CandidateProjectsModule } from './candidate-projects/candidate-projects.module';
import { ScreeningCoordinationModule } from './screening-coordination/screening-coordination.module';
import { ProcessingModule } from './processing/processing.module';
import { ProcessingRemindersModule } from './processing-reminders/processing-reminders.module';
import { GoogleDriveModule } from './google-drive/google-drive.module';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { ProjectCoordinatorDashboardModule } from './project-coordinator-dashboard/project-coordinator-dashboard.module';
import { RecruiterAnalyticsModule } from './analytics/recruiter/recruiter-analytics.module';
import { AgentsModule } from './agents/agents.module';
import { IntroductionVideosModule } from './introduction-videos/introduction-videos.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        // prod
        // ttl: 60000,
        // limit: 100,
        ttl: 60,
        limit: 1000000000, // Increased for load testing
      },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [whatsappConfig],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    SystemConfigModule, // Add system config globally
    AuthModule,
    RolesModule,
    UsersModule,
    ClientsModule,
    ProjectsModule,
    CandidatesModule,
    TeamsModule,
    DocumentsModule,
    CountriesModule,
    RoleCatalogModule,
    RoleDepartmentsModule,
    QualificationsModule,
    ProfessionTypesModule,
    AuditModule,
    SystemModule,
    UploadModule,
    NotificationsModule,
    CandidateAllocationModule,
    EligibilityModule,
    OtpModule,
    InterviewsModule,
    InterviewsModule,
    MetaModule,
    CandidateStatusModule,
    CandidateStatusHistoryModule,
    RnrRemindersModule,
    CallbackRemindersModule,
    CandidateProjectStatusModule,
    CandidateProjectsModule,
    CandidateProjectStatusHistoryModule,
    ScreeningCoordinationModule,
    ProcessingModule,
    ProcessingRemindersModule,
    GoogleDriveModule,
    AdminDashboardModule,
    ProjectCoordinatorDashboardModule,
    RecruiterAnalyticsModule,
    AgentsModule,
    IntroductionVideosModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    OtpService,
  ],
})
export class AppModule {}
