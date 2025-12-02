import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { QualificationsModule } from './qualifications/qualifications.module';
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
import { SystemConfigModule } from './system-config/system-config.module';
import { ProjectRoleCatalogModule } from './project-role-catalog/project-role-catalog.module';
import { CandidateProjectStatusModule } from './candidate-project-status/candidate-project-status.module';
import { CandidateProjectsModule } from './candidate-projects/candidate-projects.module';
import { MockInterviewCoordinationModule } from './mock-interview-coordination/mock-interview-coordination.module';
import { ProcessingModule } from './processing/processing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
    QualificationsModule,
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
    ProjectRoleCatalogModule,
    CandidateProjectStatusModule,
    CandidateProjectsModule,
    CandidateProjectStatusHistoryModule,
    MockInterviewCoordinationModule,
    ProcessingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
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
