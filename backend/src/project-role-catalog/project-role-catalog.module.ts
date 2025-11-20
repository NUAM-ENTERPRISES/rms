import { Module } from '@nestjs/common';
import { ProjectRoleCatalogController } from './project-role-catalog.controller';
import { ProjectRoleCatalogService } from './project-role-catalog.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectRoleCatalogController],
  providers: [ProjectRoleCatalogService],
  exports: [ProjectRoleCatalogService],
})
export class ProjectRoleCatalogModule {}
