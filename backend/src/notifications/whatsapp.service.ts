import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface SendWhatsAppMessageDto {
  to: string; // Phone number with country code (e.g., "919876543210")
  templateName: string;
  languageCode?: string;
  bodyParameters?: string[]; // Parameters to replace in template body
  headerParameters?: string[]; // Parameters for header if needed
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl: string;
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.phoneNumberId =
      this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID') ||
      '949404321591561';

    this.accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN') || '';

    this.isEnabled = this.configService.get<string>('WHATSAPP_ENABLED') === 'true';

    // Use template literal correctly
    this.apiUrl = `https://graph.facebook.com/v22.0/${this.phoneNumberId}/messages`;

    if (!this.isEnabled) {
      this.logger.warn('WhatsApp integration is disabled. Set WHATSAPP_ENABLED=true to enable.');
    } else if (!this.accessToken) {
      this.logger.warn('WhatsApp access token is not configured. Messages will not be sent.');
    } else {
      this.logger.log('WhatsApp service initialized successfully');
    }
  }

  /**
   * Send a WhatsApp template message
   */
  async sendTemplateMessage(dto: SendWhatsAppMessageDto): Promise<any> {
    if (!this.isEnabled) {
      this.logger.debug('WhatsApp is disabled, skipping message send');
      return { success: false, message: 'WhatsApp is disabled' };
    }

    if (!this.accessToken) {
      this.logger.error('WhatsApp access token is not configured');
      return { success: false, message: 'WhatsApp access token not configured' };
    }

    // Format phone number → must be digits only + country code, no +
    let formattedPhone = dto.to.replace(/[^\d]/g, ''); // remove everything except digits

    if (formattedPhone.startsWith('0')) {
      formattedPhone = formattedPhone.substring(1); // optional: remove leading zero if common in your region
    }

    // Optional: minimal validation
    if (formattedPhone.length < 8 || formattedPhone.length > 15) {
      this.logger.warn(`Invalid phone number format: ${dto.to}`);
      return { success: false, message: 'Invalid phone number format' };
    }

    try {
      const components = this.buildTemplateComponents(dto);

      const payload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: dto.templateName,
          language: {
            code: dto.languageCode || 'en_US',
          },
          ...(components.length > 0 && { components }),
        },
      };

      this.logger.log(`Sending WhatsApp message to ${formattedPhone} with template: ${dto.templateName}`);
      this.logger.debug(`Payload: ${JSON.stringify(payload, null, 2)}`);

      const response = await axios.post<any>(
        this.apiUrl,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const messageId = response.data?.messages?.[0]?.id || 'N/A';
      this.logger.log(`WhatsApp message sent successfully to ${formattedPhone}. Message ID: ${messageId}`);

      return {
        success: true,
        messageId,
        data: response.data,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      this.logger.error(`Failed to send WhatsApp message to ${formattedPhone}: ${errorMessage}`);

      if (error.response?.data) {
        this.logger.error(`WhatsApp API Error: ${JSON.stringify(error.response.data, null, 2)}`);
      }

      return {
        success: false,
        message: errorMessage,
        error: error.response?.data || error,
      };
    }
  }

  /**
   * Build template components with parameters
   */
  private buildTemplateComponents(dto: SendWhatsAppMessageDto): Array<{
    type: string;
    parameters: Array<{ type: string; text: string }>;
  }> {
    const components: Array<{
      type: string;
      parameters: Array<{ type: string; text: string }>;
    }> = [];

    // Header (image/text/header supported — here assuming text)
    if (dto.headerParameters?.length) {
      components.push({
        type: 'header',
        parameters: dto.headerParameters.map((value) => ({
          type: 'text',
          text: value,
        })),
      });
    }

    // Body parameters
    if (dto.bodyParameters?.length) {
      components.push({
        type: 'body',
        parameters: dto.bodyParameters.map((value) => ({
          type: 'text',
          text: value,
        })),
      });
    }

    return components;
  }

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

    // TODO: After template approval, update:
    // templateName: 'candidate_status_update'
    // and enable parameters

    return this.sendTemplateMessage({
      to: phoneNumber,
      templateName: 'hello_world', // ← CHANGE THIS after Meta approval
      languageCode: 'en_US',
      // bodyParameters: [
      //   candidateName.split(' ')[0] || candidateName, // First name or full
      //   statusName,
      //   additionalInfo || 'No additional info',
      // ],
    });
  }

  /**
   * Validate & format phone number (returns formatted string or null)
   */
  validatePhoneNumber(countryCode: string, mobileNumber: string): string | null {
    if (!countryCode || !mobileNumber) return null;

    const cleanCountry = countryCode.replace(/\D/g, '');
    const cleanMobile = mobileNumber.replace(/\D/g, '');

    if (!cleanMobile) return null;

    // Most WhatsApp APIs expect no leading zero after country code
    let mobile = cleanMobile;
    if (mobile.startsWith('0')) {
      mobile = mobile.substring(1);
    }

    return `${cleanCountry}${mobile}`;
  }
}