import { Module } from '@nestjs/common';
import { CandidateStatusController } from './candidate-status.controller';
import { CandidateStatusService } from './candidate-status.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CandidateStatusController],
  providers: [CandidateStatusService],
  exports: [CandidateStatusService],
})
export class CandidateStatusModule {}
