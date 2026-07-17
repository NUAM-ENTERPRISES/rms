import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../common/audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CountryCoverageController } from './country-coverage.controller';
import { CountryCoverageService } from './country-coverage.service';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule, NotificationsModule],
  controllers: [CountryCoverageController],
  providers: [CountryCoverageService],
  exports: [CountryCoverageService],
})
export class CountryCoverageModule {}
