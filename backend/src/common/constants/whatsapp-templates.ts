export const WHATSAPP_TEMPLATE_TYPES = {
    NUAM_ACCOUNT_CREATION_V1: 'num_account_creation_v1',
    HELLO_WORLD: 'hello_world',
};

export type WhatsAppTemplateType =
  typeof WHATSAPP_TEMPLATE_TYPES[keyof typeof WHATSAPP_TEMPLATE_TYPES];