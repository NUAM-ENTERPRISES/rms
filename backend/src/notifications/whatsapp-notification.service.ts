import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WHATSAPP_TEMPLATE_TYPES } from '../common/constants/whatsapp-templates';

@Injectable()
export class WhatsAppNotificationService {
  private readonly logger = new Logger(WhatsAppNotificationService.name);

  constructor(private readonly whatsappService: WhatsAppService) {}

  /**
   * Send candidate status change notification
   */
  async sendCandidateStatusUpdate(
    candidateName: string,
    phoneNumber: string,
    statusName: string,
    additionalInfo?: string,
  ): Promise<any> {
    this.logger.log(`Sending status update to ${phoneNumber}: ${candidateName} - ${statusName}`);

    // Template: candidate_status_update_v1
    // Body: Hi {{1}}, Your application status has been updated to {{2}}. We will contact you if further action is required.
    
    return this.whatsappService.sendTemplateMessage({
      to: phoneNumber,
      templateName: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_UPDATE_V1,
      languageCode: 'en',
      bodyParameters: [
        candidateName.split(' ')[0] || candidateName, // {{1}}
        statusName,                                  // {{2}}
      ],
    });
  }
}
