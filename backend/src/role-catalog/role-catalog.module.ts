import { Module } from '@nestjs/common';
import { RoleCatalogController } from './role-catalog.controller';
import { RoleCatalogService } from './role-catalog.service';
import { PrismaModule } from '../database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../common/audit/audit.module';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule],
  controllers: [RoleCatalogController],
  providers: [RoleCatalogService],
  exports: [RoleCatalogService],
})
export class RoleCatalogModule {}
