import { Module } from '@nestjs/common';
import { CandidateMatchingService } from './candidate-matching.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CandidateMatchingService],
  exports: [CandidateMatchingService],
})
export class CandidateMatchingModule {}
