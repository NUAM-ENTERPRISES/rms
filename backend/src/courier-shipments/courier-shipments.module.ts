import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CourierShipmentsController } from './courier-shipments.controller';
import { CourierShipmentsService } from './courier-shipments.service';

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule],
  controllers: [CourierShipmentsController],
  providers: [CourierShipmentsService],
  exports: [CourierShipmentsService],
})
export class CourierShipmentsModule {}
