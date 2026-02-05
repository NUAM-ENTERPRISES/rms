import { Module } from '@nestjs/common';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';
import { CandidateQualificationController } from './candidate-qualification.controller';
import { CandidateQualificationService } from './candidate-qualification.service';
import { CandidateAssignmentController } from './controllers/candidate-assignment.controller';
import { CandidateAssignmentValidatorService } from './services/candidate-assignment-validator.service';
import { RecruiterAssignmentService } from './services/recruiter-assignment.service';
import { RnrCreAssignmentService } from './services/rnr-cre-assignment.service';
import { PipelineService } from './pipeline.service';
import { PrismaModule } from '../database/prisma.module';
import { WorkExperienceModule } from './work-experience.module';
import { OutboxService } from '../notifications/outbox.service';
import { UnifiedEligibilityService } from '../candidate-eligibility/unified-eligibility.service';
import { RnrRemindersModule } from '../rnr-reminders/rnr-reminders.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, WorkExperienceModule, RnrRemindersModule, NotificationsModule],
  controllers: [
    CandidatesController,
    CandidateQualificationController,
    CandidateAssignmentController,
  ],
  providers: [
    CandidatesService,
    CandidateQualificationService,
    CandidateAssignmentValidatorService,
    RecruiterAssignmentService,
    RnrCreAssignmentService,
    PipelineService,
    OutboxService,
    UnifiedEligibilityService,
  ],
  exports: [
    CandidatesService, 
    CandidateQualificationService,
    RecruiterAssignmentService, // Export for RNR CRE assignment
  ],
})
export class CandidatesModule {}
