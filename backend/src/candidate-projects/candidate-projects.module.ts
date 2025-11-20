import { Module } from '@nestjs/common';
import { CandidateProjectsController } from './candidate-projects.controller';
import { CandidateProjectsService } from './candidate-projects.service';
import { PrismaModule } from '../database/prisma.module';
import { CandidateProjectStatusModule } from '../candidate-project-status/candidate-project-status.module';

@Module({
  imports: [PrismaModule, CandidateProjectStatusModule],
  controllers: [CandidateProjectsController],
  providers: [CandidateProjectsService],
  exports: [CandidateProjectsService],
})
export class CandidateProjectsModule {}
