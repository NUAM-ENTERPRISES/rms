import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { PrismaModule } from '../database/prisma.module';
import { CountriesModule } from '../countries/countries.module';
import { QualificationsModule } from '../qualifications/qualifications.module';
import { RoleCatalogModule } from '../role-catalog/role-catalog.module';

@Module({
  imports: [PrismaModule, CountriesModule, QualificationsModule, RoleCatalogModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
