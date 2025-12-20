import { Module } from '@nestjs/common';
import { RoleDepartmentsController } from './role-departments.controller';
import { RoleDepartmentsService } from './role-departments.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RoleDepartmentsController],
  providers: [RoleDepartmentsService],
  exports: [RoleDepartmentsService],
})
export class RoleDepartmentsModule {}
