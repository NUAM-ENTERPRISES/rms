import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { ProjectCoordinatorDashboardService } from './project-coordinator-dashboard.service';
import { ProjectCoordinatorDashboardController } from './project-coordinator-dashboard.controller';

@Module({
  imports: [PrismaModule],
  providers: [ProjectCoordinatorDashboardService],
  controllers: [ProjectCoordinatorDashboardController],
})
export class ProjectCoordinatorDashboardModule {}
