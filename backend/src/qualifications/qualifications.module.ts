import { Module } from '@nestjs/common';
import { QualificationsController } from './qualifications.controller';
import { QualificationsService } from './qualifications.service';
import { PrismaModule } from '../database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../common/audit/audit.module';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule],
  controllers: [QualificationsController],
  providers: [QualificationsService],
  exports: [QualificationsService],
})
export class QualificationsModule {}
