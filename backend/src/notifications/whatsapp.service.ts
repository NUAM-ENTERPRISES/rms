import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SendWhatsAppMessageDto } from './dto/send-whatsapp.dto';
import {
  buildCandidateStatusWhatsAppBodyParameters,
  isCandidateStatusWhatsAppNotifiable,
  resolveCandidateStatusWhatsAppTemplate,
  type WhatsAppTemplateType,
} from '../common/constants/whatsapp-templates';

export interface SendCandidateStatusWhatsAppInput {
  phoneNumber: string;
  candidateName: string;
  statusName: string;
  roleOrProjectName?: string;
  additionalDetail?: string;
  languageCode?: string;
}

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

  private getApiUrl(): string {
    return `${this.apiBaseUrl}${this.phoneNumberId}/messages`;
  }

  getTemplateForCandidateStatus(
    statusName: string,
  ): WhatsAppTemplateType | null {
    return resolveCandidateStatusWhatsAppTemplate(statusName);
  }

  isCandidateStatusNotifiable(statusName: string): boolean {
    return isCandidateStatusWhatsAppNotifiable(statusName);
  }

  buildCandidateStatusBodyParameters(
    templateName: WhatsAppTemplateType,
    input: Pick<
      SendCandidateStatusWhatsAppInput,
      'candidateName' | 'roleOrProjectName' | 'additionalDetail'
    >,
  ): string[] {
    return buildCandidateStatusWhatsAppBodyParameters(templateName, input);
  }

  formatStatusDetailDateTime(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'TBD';
    }

    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  }

  async sendCandidateStatusNotification(
    input: SendCandidateStatusWhatsAppInput,
  ): Promise<{
    success: boolean;
    message?: string;
    messageId?: string;
    data?: unknown;
    error?: unknown;
  }> {
    const templateName = this.getTemplateForCandidateStatus(input.statusName);
    if (!templateName) {
      this.logger.debug(
        `No WhatsApp template mapped for candidate status: ${input.statusName}`,
      );
      return {
        success: false,
        message: `No WhatsApp template mapped for status: ${input.statusName}`,
      };
    }

    const bodyParameters = this.buildCandidateStatusBodyParameters(
      templateName,
      input,
    );

    this.logger.log(
      `Sending candidate status WhatsApp (${templateName}) to ${input.phoneNumber} for status ${input.statusName}`,
    );

    return this.sendTemplateMessage({
      to: input.phoneNumber,
      templateName,
      languageCode: input.languageCode || 'en_US',
      ...(bodyParameters.length > 0 && { bodyParameters }),
    });
  }

  async sendTemplateMessage(dto: SendWhatsAppMessageDto): Promise<{
    success: boolean;
    message?: string;
    messageId?: string;
    data?: unknown;
    error?: unknown;
  }> {
    if (!this.isEnabled) {
      this.logger.debug('WhatsApp is disabled, skipping message send');
      return { success: false, message: 'WhatsApp is disabled' };
    }

    if (!this.accessToken || !this.phoneNumberId) {
      this.logger.error('WhatsApp configuration (Access Token or Phone Number ID) is missing');
      return { success: false, message: 'WhatsApp configuration incomplete' };
    }

    let formattedPhone = dto.to.replace(/[^\d]/g, '');

    if (formattedPhone.startsWith('0')) {
      formattedPhone = formattedPhone.substring(1);
    }

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

      this.logger.log(
        `Sending WhatsApp message to ${formattedPhone} with template: ${dto.templateName}`,
      );
      this.logger.debug(`Payload: ${JSON.stringify(payload, null, 2)}`);

      const response = await axios.post<{
        messages?: Array<{ id?: string }>;
      }>(this.getApiUrl(), payload, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const messageId = response.data?.messages?.[0]?.id || 'N/A';
      this.logger.log(
        `WhatsApp message sent successfully to ${formattedPhone}. Message ID: ${messageId}`,
      );

      return {
        success: true,
        messageId,
        data: response.data,
      };
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { error?: { message?: string } } };
        message?: string;
      };
      const errorMessage =
        axiosError.response?.data?.error?.message ||
        axiosError.message ||
        'Unknown WhatsApp API error';
      this.logger.error(
        `Failed to send WhatsApp message to ${formattedPhone}: ${errorMessage}`,
      );

      if (axiosError.response?.data) {
        this.logger.error(
          `WhatsApp API Error: ${JSON.stringify(axiosError.response.data, null, 2)}`,
        );
      }

      return {
        success: false,
        message: errorMessage,
        error: axiosError.response?.data || error,
      };
    }
  }

  private buildTemplateComponents(dto: SendWhatsAppMessageDto): Array<{
    type: string;
    parameters: Array<{ type: string; text: string }>;
  }> {
    const components: Array<{
      type: string;
      parameters: Array<{ type: string; text: string }>;
    }> = [];

    if (dto.headerParameters?.length) {
      components.push({
        type: 'header',
        parameters: dto.headerParameters.map((value) => ({
          type: 'text',
          text: value,
        })),
      });
    }

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

  validatePhoneNumber(countryCode: string, mobileNumber: string): string | null {
    if (!countryCode || !mobileNumber) return null;

    const cleanCountry = countryCode.replace(/\D/g, '');
    const cleanMobile = mobileNumber.replace(/\D/g, '');

    if (!cleanMobile) return null;

    let mobile = cleanMobile;
    if (mobile.startsWith('0')) {
      mobile = mobile.substring(1);
    }

    return `${cleanCountry}${mobile}`;
  }
}
