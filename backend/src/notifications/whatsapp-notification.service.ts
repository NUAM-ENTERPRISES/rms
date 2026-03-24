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
      templateName: WHATSAPP_TEMPLATE_TYPES.TEST_STATUS,
      languageCode: 'en_US',
      bodyParameters: [
        candidateName.split(' ')[0] || candidateName, // {{1}}
        statusName,                                  // {{2}}
      ],
    });
  }

  /**
   * Send screening scheduled notification to candidate
   */
  async sendScreeningScheduled(
    candidateName: string,
    phoneNumber: string,
    projectName: string,
    roleTitle: string,
    scheduledTimeFormatted: string,
  ): Promise<any> {
    this.logger.log(`Sending screening notification to ${phoneNumber}: ${candidateName} for ${projectName}`);

    // Template: screening_scheduled_v1
    // Body: Hi {{1}}, your screening for {{2}} ({{3}}) has been scheduled for {{4}}. Please be prepared.
    
    return this.whatsappService.sendTemplateMessage({
      to: phoneNumber,
      templateName: WHATSAPP_TEMPLATE_TYPES.SCREENING_SCHEDULED,
      languageCode: 'en_US',
      bodyParameters: [
        candidateName.split(' ')[0] || candidateName, // {{1}}
        projectName,                                 // {{2}}
        roleTitle,                                   // {{3}}
        scheduledTimeFormatted,                      // {{4}}
      ],
    });
  }
}
