import { Module } from '@nestjs/common';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';
import { PrismaModule } from '../database/prisma.module';
import { WorkExperienceModule } from './work-experience.module';
import { OutboxService } from '../notifications/outbox.service';

@Module({
  imports: [PrismaModule, WorkExperienceModule],
  controllers: [CandidatesController],
  providers: [CandidatesService, OutboxService],
  exports: [CandidatesService],
})
export class CandidatesModule {}
