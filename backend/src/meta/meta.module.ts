import { Module } from '@nestjs/common';
import { MetaService } from './meta.service';
import { MetaController } from './meta.controller';
import { PrismaModule } from '../database/prisma.module';
import { CandidatesModule } from '../candidates/candidates.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SystemConfigModule } from '../system-config/system-config.module';

@Module({
  imports: [
    PrismaModule,
    CandidatesModule,
    NotificationsModule,
    SystemConfigModule,
  ],
  providers: [MetaService],
  controllers: [MetaController],
})
export class MetaModule {}
