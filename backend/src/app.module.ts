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

import { OtpService } from './otp/otp.service';
import { OtpModule } from './otp/otp.module';

import { CandidateEligibilityModule } from './candidate-eligibility/candidate-eligibility.module';
import { InterviewsModule } from './interviews/interviews.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
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
    OtpModule,
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
