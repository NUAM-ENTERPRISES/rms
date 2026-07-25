import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  META_CHANNEL_ADAPTERS,
  MetaChannelAdapter,
} from '../meta-messaging/channels/channel-adapter';
import {
  META_OUTBOUND_QUEUE,
  MetaOutboundJobData,
} from '../meta-messaging/meta-outbound.types';

@Processor(META_OUTBOUND_QUEUE, {
  concurrency: 2,
})
export class MetaOutboundProcessor extends WorkerHost {
  private readonly logger = new Logger(MetaOutboundProcessor.name);
  private readonly adaptersByChannel: Map<string, MetaChannelAdapter>;

  constructor(
    @Inject(META_CHANNEL_ADAPTERS)
    adapters: MetaChannelAdapter[],
  ) {
    super();
    this.adaptersByChannel = new Map(
      adapters.map((adapter) => [adapter.channel, adapter]),
    );
  }

  async process(job: Job<MetaOutboundJobData>): Promise<{
    success: boolean;
    messageId?: string;
    channel: string;
    kind: string;
  }> {
    const { channel, kind, to, idempotencyKey } = job.data;
    this.logger.log(
      `Processing meta-outbound job ${job.id} (${channel}/${kind}) to ${to} key=${idempotencyKey}`,
    );

    const adapter = this.adaptersByChannel.get(channel);
    if (!adapter) {
      throw new Error(`No channel adapter registered for: ${channel}`);
    }

    const result = await adapter.send(job.data);

    this.logger.log(
      `meta-outbound job ${job.id} completed for ${channel}/${kind} messageId=${result.messageId ?? 'N/A'}`,
    );

    return {
      success: result.success,
      messageId: result.messageId,
      channel,
      kind,
    };
  }
}
