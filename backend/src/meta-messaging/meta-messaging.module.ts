import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MetaOutboundProcessor } from '../jobs/meta-outbound.processor';
import { WhatsAppService } from '../notifications/whatsapp.service';
import { META_CHANNEL_ADAPTERS } from './channels/channel-adapter';
import { FacebookChannelAdapter } from './channels/facebook.channel-adapter';
import { InstagramChannelAdapter } from './channels/instagram.channel-adapter';
import { WhatsAppChannelAdapter } from './channels/whatsapp.channel-adapter';
import { MetaGraphClient } from './meta-graph.client';
import { MetaOutboundService } from './meta-outbound.service';
import { META_OUTBOUND_QUEUE } from './meta-outbound.types';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: META_OUTBOUND_QUEUE,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),
  ],
  providers: [
    WhatsAppService,
    MetaGraphClient,
    WhatsAppChannelAdapter,
    FacebookChannelAdapter,
    InstagramChannelAdapter,
    {
      provide: META_CHANNEL_ADAPTERS,
      useFactory: (
        whatsapp: WhatsAppChannelAdapter,
        facebook: FacebookChannelAdapter,
        instagram: InstagramChannelAdapter,
      ) => [whatsapp, facebook, instagram],
      inject: [
        WhatsAppChannelAdapter,
        FacebookChannelAdapter,
        InstagramChannelAdapter,
      ],
    },
    MetaOutboundService,
    MetaOutboundProcessor,
  ],
  exports: [MetaOutboundService, BullModule, MetaGraphClient, WhatsAppService],
})
export class MetaMessagingModule {}
