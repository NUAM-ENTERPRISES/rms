import { Module } from '@nestjs/common';
import { MetaService } from './meta.service';
import { MetaController } from './meta.controller';
import { MetaLeadsController } from './meta-leads.controller';
import { PrismaModule } from '../database/prisma.module';
import { CandidatesModule } from '../candidates/candidates.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SystemConfigModule } from '../system-config/system-config.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    CandidatesModule,
    NotificationsModule,
    SystemConfigModule,
    AuthModule,
  ],
  providers: [MetaService],
  controllers: [MetaController, MetaLeadsController],
})
export class MetaModule {}
