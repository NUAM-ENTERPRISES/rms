import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  WHATSAPP_TEMPLATE_TYPES,
  getWhatsAppTemplateForStatus,
} from '../common/constants/whatsapp-templates';
import { MetaOutboundService } from '../meta-messaging/meta-outbound.service';
import { WhatsAppTemplatePayload } from '../meta-messaging/meta-outbound.types';

@Injectable()
export class WhatsAppNotificationService {
  private readonly logger = new Logger(WhatsAppNotificationService.name);

  constructor(
    private readonly metaOutboundService: MetaOutboundService,
    private readonly configService: ConfigService,
  ) {}

  private getTemplateHeaderImageUrl(): string | undefined {
    const fromWhatsAppConfig = this.configService.get<string>(
      'whatsapp.templateHeaderImageUrl',
    );
    const fromEnv = this.configService.get<string>(
      'WHATSAPP_TEMPLATE_HEADER_IMAGE_URL',
    );
    const url = (fromWhatsAppConfig || fromEnv || '').trim();
    return url || undefined;
  }

  /**
   * Enqueue candidate status change WhatsApp notification
   */
  async sendCandidateStatusUpdate(
    candidateName: string,
    phoneNumber: string,
    statusName: string,
    additionalInfo?: string,
    options?: { candidateId?: string },
  ): Promise<{ success: boolean; jobId?: string; message?: string }> {
    const templateName = getWhatsAppTemplateForStatus(statusName);
    if (!templateName) {
      this.logger.debug(
        `Skipping WhatsApp for status "${statusName}" — not configured`,
      );
      return {
        success: false,
        message: 'Status not configured for WhatsApp',
      };
    }

    const headerImageLink = this.getTemplateHeaderImageUrl();
    if (!headerImageLink) {
      this.logger.warn(
        'Skipping status WhatsApp — WHATSAPP_TEMPLATE_HEADER_IMAGE_URL is not set',
      );
      return {
        success: false,
        message: 'WhatsApp template header image URL is not configured',
      };
    }

    this.logger.log(
      `Enqueueing status update to ${phoneNumber}: ${candidateName} - ${statusName} (template: ${templateName})`,
    );

    const firstName = candidateName.split(' ')[0] || candidateName;
    const payload: WhatsAppTemplatePayload = {
      templateName,
      languageCode: 'en_US',
      headerImageLink,
      bodyParameters: [firstName],
    };

    // additionalInfo reserved for future template params
    void additionalInfo;

    const idempotencyKey = [
      'wa-status',
      options?.candidateId || phoneNumber,
      statusName.replace(/\s+/g, '-').toLowerCase(),
      // minute bucket reduces duplicate spam while allowing later re-sends
      new Date().toISOString().slice(0, 16),
    ].join(':');

    const { jobId } = await this.metaOutboundService.enqueue({
      channel: 'whatsapp',
      kind: 'template',
      to: phoneNumber,
      payload: payload as unknown as Record<string, unknown>,
      idempotencyKey,
    });

    return { success: true, jobId };
  }

  /**
   * Enqueue screening scheduled WhatsApp notification to candidate
   */
  async sendScreeningScheduled(
    candidateName: string,
    phoneNumber: string,
    projectName: string,
    roleTitle: string,
    scheduledTimeFormatted: string,
    options?: { eventId?: string; candidateProjectMapId?: string },
  ): Promise<{ success: boolean; jobId?: string; message?: string }> {
    this.logger.log(
      `Enqueueing screening notification to ${phoneNumber}: ${candidateName} for ${projectName}`,
    );

    const firstName = candidateName.split(' ')[0] || candidateName;
    const payload: WhatsAppTemplatePayload = {
      templateName: WHATSAPP_TEMPLATE_TYPES.SCREENING_SCHEDULED,
      languageCode: 'en_US',
      bodyParameters: [firstName, projectName, roleTitle, scheduledTimeFormatted],
    };

    const idempotencyKey = [
      'wa-screening',
      options?.eventId ||
        options?.candidateProjectMapId ||
        phoneNumber,
      scheduledTimeFormatted.replace(/\s+/g, '-').toLowerCase(),
    ].join(':');

    const { jobId } = await this.metaOutboundService.enqueue({
      channel: 'whatsapp',
      kind: 'template',
      to: phoneNumber,
      payload: payload as unknown as Record<string, unknown>,
      idempotencyKey,
    });

    return { success: true, jobId };
  }
}
