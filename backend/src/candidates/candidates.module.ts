import { Module } from '@nestjs/common';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';
import { PrismaModule } from '../database/prisma.module';
import { WorkExperienceModule } from './work-experience.module';

@Module({
  imports: [PrismaModule, WorkExperienceModule],
  controllers: [CandidatesController],
  providers: [CandidatesService],
  exports: [CandidatesService],
})
export class CandidatesModule {}
