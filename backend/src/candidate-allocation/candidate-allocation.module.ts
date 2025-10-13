import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CandidateAllocationController } from './candidate-allocation.controller';
import { CandidateAllocationService } from './candidate-allocation.service';
import { CandidateMatchingModule } from '../candidate-matching/candidate-matching.module';
import { RecruiterPoolModule } from '../recruiter-pool/recruiter-pool.module';
import { RoundRobinModule } from '../round-robin/round-robin.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AllocationProcessor } from '../jobs/allocation.processor';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [
    PrismaModule,
    CandidateMatchingModule,
    RecruiterPoolModule,
    RoundRobinModule,
    NotificationsModule,
    BullModule.registerQueue({
      name: 'allocation',
    }),
  ],
  controllers: [CandidateAllocationController],
  providers: [CandidateAllocationService, AllocationProcessor],
  exports: [CandidateAllocationService],
})
export class CandidateAllocationModule {}
