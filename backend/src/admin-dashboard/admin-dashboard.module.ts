import { Module } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { PrismaModule } from '../database/prisma.module';
import { RecruiterAnalyticsModule } from '../analytics/recruiter/recruiter-analytics.module';

@Module({
  imports: [PrismaModule, RecruiterAnalyticsModule],
  providers: [AdminDashboardService],
  controllers: [AdminDashboardController],
  exports: [AdminDashboardService],
})
export class AdminDashboardModule {}
