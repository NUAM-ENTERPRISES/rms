import { Module } from '@nestjs/common';
import { TrainingService } from './training.service';
import { TrainingController } from './training.controller';
import { PrismaModule } from '../../database/prisma.module';
import { CandidateProjectsModule } from '../../candidate-projects/candidate-projects.module';

@Module({
  imports: [PrismaModule, CandidateProjectsModule],
  controllers: [TrainingController],
  providers: [TrainingService],
  exports: [TrainingService],
})
export class TrainingModule {}
