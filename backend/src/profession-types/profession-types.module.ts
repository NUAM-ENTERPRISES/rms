import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { ProfessionTypesController } from './profession-types.controller';
import { ProfessionTypesService } from './profession-types.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../common/audit/audit.module';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule],
  controllers: [ProfessionTypesController],
  providers: [ProfessionTypesService],
  exports: [ProfessionTypesService],
})
export class ProfessionTypesModule {}
