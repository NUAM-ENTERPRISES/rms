import { Module } from '@nestjs/common';
import { RecruiterAnalyticsController } from './recruiter-analytics.controller';
import { RecruiterAnalyticsService } from './recruiter-analytics.service';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RecruiterAnalyticsController],
  providers: [RecruiterAnalyticsService],
  exports: [RecruiterAnalyticsService],
})
export class RecruiterAnalyticsModule {}
