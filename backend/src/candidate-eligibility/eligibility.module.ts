import { Module } from '@nestjs/common';
import { EligibilityController } from './eligibility.controller';
import { UnifiedEligibilityService } from './unified-eligibility.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EligibilityController],
  providers: [UnifiedEligibilityService],
  exports: [UnifiedEligibilityService],
})
export class EligibilityModule {}
