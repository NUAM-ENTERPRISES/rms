import { Injectable, Logger } from '@nestjs/common';
import { MetaGraphClient } from '../meta-graph.client';
import {
  MetaInteractiveCtaPayload,
  MetaOutboundJobData,
  MetaTextPayload,
} from '../meta-outbound.types';
import { ChannelSendResult, MetaChannelAdapter } from './channel-adapter';

@Injectable()
export class FacebookChannelAdapter implements MetaChannelAdapter {
  readonly channel = 'facebook' as const;
  private readonly logger = new Logger(FacebookChannelAdapter.name);

  constructor(private readonly graphClient: MetaGraphClient) {}

  async send(job: MetaOutboundJobData): Promise<ChannelSendResult> {
    switch (job.kind) {
      case 'text':
        return this.sendText(job);
      case 'interactive':
        return this.sendButtonTemplate(job);
      case 'template':
        throw new Error('Facebook template kind is not supported yet');
      default:
        throw new Error(`Unsupported Facebook kind: ${job.kind}`);
    }
  }

  private async sendText(job: MetaOutboundJobData): Promise<ChannelSendResult> {
    const payload = job.payload as unknown as MetaTextPayload;
    if (!payload?.text) {
      throw new Error('Facebook text payload requires text');
    }

    const token = this.graphClient.getPageAccessToken();
    if (!token) {
      throw new Error('META_PAGE_ACCESS_TOKEN is missing');
    }

    const version = this.graphClient.getGraphVersion();
    const url = `https://graph.facebook.com/${version}/me/messages?access_token=${token}`;

    const data = await this.graphClient.post(url, {
      recipient: { id: job.to },
      message: { text: payload.text },
    });

    this.logger.log(`Facebook text sent to ${job.to}`);
    return { success: true, data };
  }

  private async sendButtonTemplate(job: MetaOutboundJobData): Promise<ChannelSendResult> {
    const payload = job.payload as unknown as MetaInteractiveCtaPayload;
    if (!payload?.url) {
      throw new Error('Facebook interactive payload requires url');
    }

    const token = this.graphClient.getPageAccessToken();
    if (!token) {
      throw new Error('META_PAGE_ACCESS_TOKEN is missing');
    }

    const version = this.graphClient.getGraphVersion();
    const url = `https://graph.facebook.com/${version}/me/messages?access_token=${token}`;

    const data = await this.graphClient.post(url, {
      recipient: { id: job.to },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: [
              {
                title: payload.headerText || 'Affiniks Registration',
                subtitle: payload.bodyText || 'Connecting Talent with Opportunity',
                buttons: [
                  {
                    type: 'web_url',
                    url: payload.url,
                    title: payload.buttonText || 'Register Now',
                    webview_height_ratio: 'full',
                  },
                ],
              },
            ],
          },
        },
      },
    });

    this.logger.log(`Facebook interactive sent to ${job.to}`);
    return { success: true, data };
  }
}
