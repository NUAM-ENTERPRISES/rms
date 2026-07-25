import { registerAs } from '@nestjs/config';

export default registerAs('whatsapp', () => ({
  enabled: process.env.WHATSAPP_ENABLED === 'true',
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v22.0/',
  /** Public HTTPS image used as Meta template IMAGE header for status WhatsApps */
  templateHeaderImageUrl: process.env.WHATSAPP_TEMPLATE_HEADER_IMAGE_URL,
}));
