import { Module } from '@nestjs/common';
import { ScreeningsController } from './screenings.controller';
import { ScreeningsService } from './screenings.service';
import { PrismaModule } from '../../database/prisma.module';
import { CandidateProjectsModule } from '../../candidate-projects/candidate-projects.module';
import { NotificationsModule } from '../../notifications/notifications.module';

@Module({
  imports: [PrismaModule, CandidateProjectsModule, NotificationsModule],
  controllers: [ScreeningsController],
  providers: [ScreeningsService],
  exports: [ScreeningsService],
})
export class ScreeningsModule {}
