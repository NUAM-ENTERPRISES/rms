import { Module } from '@nestjs/common';
import { ScreeningsController } from './screenings.controller';
import { ScreeningsService } from './screenings.service';
import { PrismaModule } from '../../database/prisma.module';
import { CandidateProjectsModule } from '../../candidate-projects/candidate-projects.module';

@Module({
  imports: [PrismaModule, CandidateProjectsModule],
  controllers: [ScreeningsController],
  providers: [ScreeningsService],
  exports: [ScreeningsService],
})
export class ScreeningsModule {}
