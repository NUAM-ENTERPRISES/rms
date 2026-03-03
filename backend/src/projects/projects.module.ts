import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
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
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
