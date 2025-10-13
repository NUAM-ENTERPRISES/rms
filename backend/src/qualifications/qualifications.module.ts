import { Module } from '@nestjs/common';
import { QualificationsController } from './qualifications.controller';
import { QualificationsService } from './qualifications.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [QualificationsController],
  providers: [QualificationsService],
  exports: [QualificationsService],
})
export class QualificationsModule {}
