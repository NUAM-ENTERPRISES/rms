import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectDeadlineAutoCompleteService } from './project-deadline-auto-complete.service';
import { PrismaModule } from '../database/prisma.module';
import { CountriesModule } from '../countries/countries.module';
import { QualificationsModule } from '../qualifications/qualifications.module';
import { RoleCatalogModule } from '../role-catalog/role-catalog.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    CountriesModule,
    QualificationsModule,
    RoleCatalogModule,
    NotificationsModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectDeadlineAutoCompleteService],
  exports: [ProjectsService, ProjectDeadlineAutoCompleteService],
})
export class ProjectsModule {}
