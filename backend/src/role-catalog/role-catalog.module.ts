import { Module } from '@nestjs/common';
import { RoleCatalogController } from './role-catalog.controller';
import { RoleCatalogService } from './role-catalog.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RoleCatalogController],
  providers: [RoleCatalogService],
  exports: [RoleCatalogService],
})
export class RoleCatalogModule {}
