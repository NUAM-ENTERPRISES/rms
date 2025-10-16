import { Module } from '@nestjs/common';
import { CandidateMatchingService } from './candidate-matching.service';
import { PrismaModule } from '../database/prisma.module';
import { UnifiedEligibilityService } from '../candidate-eligibility/unified-eligibility.service';

@Module({
  imports: [PrismaModule],
  providers: [CandidateMatchingService, UnifiedEligibilityService],
  exports: [CandidateMatchingService],
})
export class CandidateMatchingModule {}
