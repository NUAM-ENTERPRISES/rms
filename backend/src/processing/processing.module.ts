import { Module } from '@nestjs/common';
import { ProcessingController } from './processing.controller';
import { ProcessingService } from './processing.service';
import { PrismaModule } from '../database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { HrdRemindersModule } from '../hrd-reminders/hrd-reminders.module';
import { DataFlowRemindersModule } from '../data-flow-reminders/data-flow-reminders.module';

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule, HrdRemindersModule, DataFlowRemindersModule],
  controllers: [ProcessingController],
  providers: [ProcessingService],
  exports: [ProcessingService],
})
export class ProcessingModule {}
