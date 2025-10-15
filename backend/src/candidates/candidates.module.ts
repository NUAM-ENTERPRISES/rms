import { Module } from '@nestjs/common';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';
import { CandidateQualificationController } from './candidate-qualification.controller';
import { CandidateQualificationService } from './candidate-qualification.service';
import { CandidateAssignmentController } from './controllers/candidate-assignment.controller';
import { CandidateAssignmentValidatorService } from './services/candidate-assignment-validator.service';
import { PrismaModule } from '../database/prisma.module';
import { WorkExperienceModule } from './work-experience.module';
import { OutboxService } from '../notifications/outbox.service';

@Module({
  imports: [PrismaModule, WorkExperienceModule],
  controllers: [
    CandidatesController,
    CandidateQualificationController,
    CandidateAssignmentController,
  ],
  providers: [
    CandidatesService,
    CandidateQualificationService,
    CandidateAssignmentValidatorService,
    OutboxService,
  ],
  exports: [CandidatesService, CandidateQualificationService],
})
export class CandidatesModule {}
