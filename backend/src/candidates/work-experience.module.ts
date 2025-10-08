import { Module } from '@nestjs/common';
import { WorkExperienceService } from './work-experience.service';
import { WorkExperienceController } from './work-experience.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WorkExperienceController],
  providers: [WorkExperienceService],
  exports: [WorkExperienceService],
})
export class WorkExperienceModule {}
