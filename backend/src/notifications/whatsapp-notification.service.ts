import { Injectable, Logger } from '@nestjs/common';
import { WHATSAPP_TEMPLATE_TYPES } from '../common/constants/whatsapp-templates';
import { MetaOutboundService } from '../meta-messaging/meta-outbound.service';
import { WhatsAppTemplatePayload } from '../meta-messaging/meta-outbound.types';

@Injectable()
export class WhatsAppNotificationService {
  private readonly logger = new Logger(WhatsAppNotificationService.name);

  constructor(private readonly metaOutboundService: MetaOutboundService) {}

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
    this.logger.log(
      `Enqueueing status update to ${phoneNumber}: ${candidateName} - ${statusName}`,
    );

    const firstName = candidateName.split(' ')[0] || candidateName;
    const payload: WhatsAppTemplatePayload = {
      templateName: WHATSAPP_TEMPLATE_TYPES.TEST_STATUS,
      languageCode: 'en_US',
      bodyParameters: [firstName, statusName],
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
