import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';
import { CandidateQualificationController } from './candidate-qualification.controller';
import { CandidateQualificationService } from './candidate-qualification.service';
import { CandidateAssignmentController } from './controllers/candidate-assignment.controller';
import { CandidateAssignmentValidatorService } from './services/candidate-assignment-validator.service';
import { CandidateCodeService } from './services/candidate-code.service';
import { CandidateListFilterService } from './services/candidate-list-filter.service';
import { RecruiterAssignmentService } from './services/recruiter-assignment.service';
import { RnrCreAssignmentService } from './services/rnr-cre-assignment.service';
import { OperationsFollowUpSweeperService } from './services/operations-follow-up-sweeper.service';
import { PipelineService } from './pipeline.service';
import { PrismaModule } from '../database/prisma.module';
import { WorkExperienceModule } from './work-experience.module';
import { OutboxService } from '../notifications/outbox.service';
import { UnifiedEligibilityService } from '../candidate-eligibility/unified-eligibility.service';
import { RnrRemindersModule } from '../rnr-reminders/rnr-reminders.module';
import { CallbackRemindersModule } from '../callback-reminders/callback-reminders.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RolesModule } from '../roles/roles.module';
import { CandidateCountryRestrictionsModule } from '../candidate-country-restrictions/candidate-country-restrictions.module';
import { RecruiterAssignmentBackfillProcessor } from '../jobs/recruiter-assignment-backfill.processor';
import { BACKFILL_UNASSIGNED_RECRUITER_QUEUE } from './constants/recruiter-assignment-backfill';

@Module({
  imports: [
    PrismaModule,
    WorkExperienceModule,
    RnrRemindersModule,
    CallbackRemindersModule,
    NotificationsModule,
    RolesModule,
    CandidateCountryRestrictionsModule,
    BullModule.registerQueue({
      name: BACKFILL_UNASSIGNED_RECRUITER_QUEUE,
    }),
  ],
  controllers: [
    CandidatesController,
    CandidateQualificationController,
    CandidateAssignmentController,
  ],
  providers: [
    CandidatesService,
    CandidateQualificationService,
    CandidateAssignmentValidatorService,
    CandidateCodeService,
    CandidateListFilterService,
    RecruiterAssignmentService,
    RecruiterAssignmentBackfillProcessor,
    RnrCreAssignmentService,
    OperationsFollowUpSweeperService,
    PipelineService,
    OutboxService,
    UnifiedEligibilityService,
  ],
  exports: [
    CandidatesService, 
    CandidateQualificationService,
    CandidateCodeService,
    RecruiterAssignmentService, // Export for RNR CRE assignment
  ],
})
export class CandidatesModule {}
