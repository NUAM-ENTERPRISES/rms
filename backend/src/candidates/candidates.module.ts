import { Module, forwardRef } from '@nestjs/common';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';
import { BulkResumeCandidateService } from './bulk-resume/bulk-resume-candidate.service';
import { BulkResumeTempFileStore } from './bulk-resume/bulk-resume-temp-file.store';
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
import { UploadModule } from '../upload/upload.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    WorkExperienceModule,
    RnrRemindersModule,
    CallbackRemindersModule,
    NotificationsModule,
    RolesModule,
    CandidateCountryRestrictionsModule,
    forwardRef(() => UploadModule),
    AuthModule,
  ],
  controllers: [
    CandidatesController,
    CandidateQualificationController,
    CandidateAssignmentController,
  ],
  providers: [
    CandidatesService,
    BulkResumeTempFileStore,
    BulkResumeCandidateService,
    CandidateQualificationService,
    CandidateAssignmentValidatorService,
    CandidateCodeService,
    CandidateListFilterService,
    RecruiterAssignmentService,
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
