import { Module, forwardRef } from '@nestjs/common';
import { CandidateProjectsController } from './candidate-projects.controller';
import { CandidateProjectsService } from './candidate-projects.service';
import { PrismaModule } from '../database/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CandidateProjectStatusModule } from '../candidate-project-status/candidate-project-status.module';
import { ProcessingModule } from '../processing/processing.module';
import { CandidateCountryRestrictionsModule } from '../candidate-country-restrictions/candidate-country-restrictions.module';

@Module({
  imports: [
    PrismaModule,
    CandidateProjectStatusModule,
    forwardRef(() => NotificationsModule),
    forwardRef(() => ProcessingModule),
    CandidateCountryRestrictionsModule,
  ],
  controllers: [CandidateProjectsController],
  providers: [CandidateProjectsService],
  exports: [CandidateProjectsService],
})
export class CandidateProjectsModule {}
