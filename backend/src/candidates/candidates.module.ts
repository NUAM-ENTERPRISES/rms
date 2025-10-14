import { Module } from '@nestjs/common';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';
import { CandidateQualificationController } from './candidate-qualification.controller';
import { CandidateQualificationService } from './candidate-qualification.service';
import { PrismaModule } from '../database/prisma.module';
import { WorkExperienceModule } from './work-experience.module';
import { OutboxService } from '../notifications/outbox.service';

@Module({
  imports: [PrismaModule, WorkExperienceModule],
  controllers: [CandidatesController, CandidateQualificationController],
  providers: [CandidatesService, CandidateQualificationService, OutboxService],
  exports: [CandidatesService, CandidateQualificationService],
})
export class CandidatesModule {}
