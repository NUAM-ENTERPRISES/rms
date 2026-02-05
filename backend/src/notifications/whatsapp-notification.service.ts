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

    // Template: num_account_creation_v1
    // Body: Hi {{1}}, Your new account has been created successfully. Please verify {{2}} to complete your profile.
    
    return this.whatsappService.sendTemplateMessage({
      to: phoneNumber,
      templateName: WHATSAPP_TEMPLATE_TYPES.NUAM_ACCOUNT_CREATION_V1,
      languageCode: 'en_US',
      bodyParameters: [
        candidateName.split(' ')[0] || candidateName, // {{1}}
        statusName,                                  // {{2}}
      ],
    });
  }
}
