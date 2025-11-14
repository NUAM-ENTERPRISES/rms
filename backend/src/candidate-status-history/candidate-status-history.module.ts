import { Module } from '@nestjs/common';
import { CandidateStatusHistoryController } from './candidate-status-history.controller';
import { CandidateStatusHistoryService } from './candidate-status-history.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CandidateStatusHistoryController],
  providers: [CandidateStatusHistoryService],
  exports: [CandidateStatusHistoryService],
})
export class CandidateStatusHistoryModule {}
