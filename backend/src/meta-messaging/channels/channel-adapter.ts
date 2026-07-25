import { MetaOutboundJobData } from '../meta-outbound.types';

export const META_CHANNEL_ADAPTERS = Symbol('META_CHANNEL_ADAPTERS');

export interface ChannelSendResult {
  success: boolean;
  messageId?: string;
  message?: string;
  data?: unknown;
}

export interface MetaChannelAdapter {
  readonly channel: MetaOutboundJobData['channel'];
  send(job: MetaOutboundJobData): Promise<ChannelSendResult>;
}
