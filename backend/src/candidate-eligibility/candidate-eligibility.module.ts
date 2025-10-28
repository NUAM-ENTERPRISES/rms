import { Module } from '@nestjs/common';
import { UnifiedEligibilityService } from './unified-eligibility.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  providers: [UnifiedEligibilityService, PrismaService],
  exports: [UnifiedEligibilityService],
})
export class CandidateEligibilityModule {}
