import { Module } from '@nestjs/common';
import { CandidateProjectStatusHistoryController } from './candidate-project-status-history.controller';
import { CandidateProjectStatusHistoryService } from './candidate-project-status-history.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [CandidateProjectStatusHistoryController],
  providers: [CandidateProjectStatusHistoryService, PrismaService],
})
export class CandidateProjectStatusHistoryModule {}
