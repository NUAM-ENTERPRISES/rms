import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { PrismaModule } from '../database/prisma.module';
import { RbacUtil } from '../auth/rbac/rbac.util';

@Module({
  imports: [PrismaModule],
  controllers: [RolesController],
  providers: [RolesService, RbacUtil],
  exports: [RolesService],
})
export class RolesModule {}
