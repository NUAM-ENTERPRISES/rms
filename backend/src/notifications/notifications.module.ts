import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { OutboxService } from './outbox.service';
import { EmailService } from './email.service';
import { NotificationsProcessor } from '../jobs/notifications.processor';
import { OutboxProcessor } from '../jobs/outbox.processor';
import { DocumentForwardProcessor } from '../jobs/document-forward.processor';
import { PrismaModule } from '../database/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { GoogleDriveModule } from '../google-drive/google-drive.module';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppNotificationService } from './whatsapp-notification.service';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    forwardRef(() => UploadModule),
    GoogleDriveModule,
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
    BullModule.registerQueue({
      name: 'document-forward',
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    OutboxService,
    EmailService,
    NotificationsProcessor,
    OutboxProcessor,
    DocumentForwardProcessor,
    WhatsAppService,
    WhatsAppNotificationService,
  ],
  exports: [
    NotificationsService,
    NotificationsGateway,
    OutboxService,
    EmailService,
    WhatsAppService,
    WhatsAppNotificationService,
    BullModule,
  ],
})
export class NotificationsModule {}