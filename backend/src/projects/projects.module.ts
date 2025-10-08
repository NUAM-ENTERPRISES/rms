import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { PrismaModule } from '../database/prisma.module';
import { CountriesModule } from '../countries/countries.module';
import { QualificationsModule } from '../qualifications/qualifications.module';

@Module({
  imports: [PrismaModule, CountriesModule, QualificationsModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
