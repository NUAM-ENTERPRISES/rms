import { Module } from '@nestjs/common';
import { CandidateProjectStatusController } from './candidate-project-status.controller';
import { CandidateProjectStatusService } from './candidate-project-status.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CandidateProjectStatusController],
  providers: [CandidateProjectStatusService],
  exports: [CandidateProjectStatusService],
})
export class CandidateProjectStatusModule {}
