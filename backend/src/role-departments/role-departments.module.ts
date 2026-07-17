import { Module } from '@nestjs/common';
import { RoleDepartmentsController } from './role-departments.controller';
import { RoleDepartmentsService } from './role-departments.service';
import { PrismaModule } from '../database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../common/audit/audit.module';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule],
  controllers: [RoleDepartmentsController],
  providers: [RoleDepartmentsService],
  exports: [RoleDepartmentsService],
})
export class RoleDepartmentsModule {}
