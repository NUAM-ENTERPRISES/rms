import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { OutboxService } from './outbox.service';
import { NotificationsProcessor } from '../jobs/notifications.processor';
import { OutboxProcessor } from '../jobs/outbox.processor';
import { PrismaModule } from '../database/prisma.module';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppNotificationService } from './whatsapp-notification.service';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
          db: configService.get<number>('REDIS_DB', 0),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    OutboxService,
    NotificationsProcessor,
    OutboxProcessor,
    WhatsAppService,
    WhatsAppNotificationService,
  ],
  exports: [
    NotificationsService,
    NotificationsGateway,
    OutboxService,
    WhatsAppService,
    WhatsAppNotificationService,
  ],
})
export class NotificationsModule {}