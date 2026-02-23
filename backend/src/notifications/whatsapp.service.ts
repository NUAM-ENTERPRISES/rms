import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SendWhatsAppMessageDto } from './dto/send-whatsapp.dto';
import { WHATSAPP_TEMPLATE_TYPES } from '../common/constants/whatsapp-templates';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly phoneNumberId: string | undefined;
  private readonly accessToken: string | undefined;
  private readonly isEnabled: boolean;
  private readonly apiBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get('whatsapp');
    this.phoneNumberId = config?.phoneNumberId;
    this.accessToken = config?.accessToken;
    this.isEnabled = config?.enabled ?? false;

    // Build API URL base
    const apiBaseUrl = config?.apiUrl || 'https://graph.facebook.com/v22.0/';
    this.apiBaseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`;

    if (!this.isEnabled) {
      this.logger.warn('WhatsApp integration is disabled. Set WHATSAPP_ENABLED=true to enable.');
    } else if (!this.accessToken || !this.phoneNumberId) {
      this.logger.warn('WhatsApp configuration is incomplete. Messages will not be sent.');
    } else {
      this.logger.log('WhatsApp service initialized successfully');
    }
  }

  /**
   * Helper to get full API URL
   */
  private getApiUrl(): string {
    return `${this.apiBaseUrl}${this.phoneNumberId}/messages`;
  }

  /**
   * Send a WhatsApp template message
   */
  async sendTemplateMessage(dto: SendWhatsAppMessageDto): Promise<any> {
    if (!this.isEnabled) {
      this.logger.debug('WhatsApp is disabled, skipping message send');
      return { success: false, message: 'WhatsApp is disabled' };
    }

    if (!this.accessToken || !this.phoneNumberId) {
      this.logger.error('WhatsApp configuration (Access Token or Phone Number ID) is missing');
      return { success: false, message: 'WhatsApp configuration incomplete' };
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
        this.getApiUrl(),
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