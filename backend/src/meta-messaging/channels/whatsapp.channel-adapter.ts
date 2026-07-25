import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppService } from '../../notifications/whatsapp.service';
import { MetaGraphClient } from '../meta-graph.client';
import {
  MetaInteractiveCtaPayload,
  MetaOutboundJobData,
  MetaTextPayload,
  WhatsAppTemplatePayload,
} from '../meta-outbound.types';
import { ChannelSendResult, MetaChannelAdapter } from './channel-adapter';

@Injectable()
export class WhatsAppChannelAdapter implements MetaChannelAdapter {
  readonly channel = 'whatsapp' as const;
  private readonly logger = new Logger(WhatsAppChannelAdapter.name);

  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly graphClient: MetaGraphClient,
  ) {}

  async send(job: MetaOutboundJobData): Promise<ChannelSendResult> {
    switch (job.kind) {
      case 'template':
        return this.sendTemplate(job);
      case 'text':
        return this.sendText(job);
      case 'interactive':
        return this.sendInteractive(job);
      default:
        throw new Error(`Unsupported WhatsApp kind: ${job.kind}`);
    }
  }

  private async sendTemplate(job: MetaOutboundJobData): Promise<ChannelSendResult> {
    const payload = job.payload as unknown as WhatsAppTemplatePayload;
    if (!payload?.templateName) {
      throw new Error('WhatsApp template payload requires templateName');
    }

    const result = await this.whatsappService.sendTemplateMessage({
      to: job.to,
      templateName: payload.templateName,
      languageCode: payload.languageCode || 'en_US',
      bodyParameters: payload.bodyParameters,
      headerParameters: payload.headerParameters,
      headerImageLink: payload.headerImageLink,
    });

    if (!result?.success) {
      throw new Error(result?.message || 'WhatsApp template send failed');
    }

    return {
      success: true,
      messageId: result.messageId,
      data: result.data,
    };
  }

  private async sendText(job: MetaOutboundJobData): Promise<ChannelSendResult> {
    const payload = job.payload as unknown as MetaTextPayload;
    if (!payload?.text) {
      throw new Error('WhatsApp text payload requires text');
    }

    const phoneNumberId = this.graphClient.getWhatsAppPhoneNumberId();
    const token = this.graphClient.getWhatsAppAccessToken();
    const version = this.graphClient.getGraphVersion();

    if (!token || !phoneNumberId) {
      throw new Error('WhatsApp configuration missing (Token/PhoneID)');
    }

    const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
    const data = (await this.graphClient.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: job.to,
        type: 'text',
        text: { body: payload.text },
      },
      token,
    )) as { messages?: Array<{ id?: string }> };

    const messageId = data?.messages?.[0]?.id;
    this.logger.log(`WhatsApp text sent to ${job.to}. Message ID: ${messageId ?? 'N/A'}`);

    return { success: true, messageId, data };
  }

  private async sendInteractive(job: MetaOutboundJobData): Promise<ChannelSendResult> {
    const payload = job.payload as unknown as MetaInteractiveCtaPayload;
    if (!payload?.url) {
      throw new Error('WhatsApp interactive payload requires url');
    }

    const phoneNumberId = this.graphClient.getWhatsAppPhoneNumberId();
    const token = this.graphClient.getWhatsAppAccessToken();
    const version = this.graphClient.getGraphVersion();

    if (!token || !phoneNumberId) {
      throw new Error('WhatsApp configuration missing (Token/PhoneID)');
    }

    const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
    const data = (await this.graphClient.post(
      url,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: job.to,
        type: 'interactive',
        interactive: {
          type: 'cta_url',
          header: {
            type: 'text',
            text: payload.headerText || 'Registration Required',
          },
          body: {
            text:
              payload.bodyText ||
              'Welcome to Affiniks! Please tap the button below to complete your registration.',
          },
          footer: {
            text: payload.footerText || 'This link expires in 24 hours.',
          },
          action: {
            name: 'cta_url',
            parameters: {
              display_text: payload.buttonText || 'Register Here',
              url: payload.url,
            },
          },
        },
      },
      token,
    )) as { messages?: Array<{ id?: string }> };

    const messageId = data?.messages?.[0]?.id;
    this.logger.log(
      `WhatsApp interactive sent to ${job.to}. Message ID: ${messageId ?? 'N/A'}`,
    );

    return { success: true, messageId, data };
  }
}
