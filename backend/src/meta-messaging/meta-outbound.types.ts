export const META_OUTBOUND_QUEUE = 'meta-outbound';

export type MetaOutboundChannel = 'whatsapp' | 'facebook' | 'instagram';

export type MetaOutboundKind = 'template' | 'text' | 'interactive';

export interface MetaOutboundJobData {
  channel: MetaOutboundChannel;
  kind: MetaOutboundKind;
  to: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
}

export interface MetaOutboundEnqueueInput {
  channel: MetaOutboundChannel;
  kind: MetaOutboundKind;
  to: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
}

export interface WhatsAppTemplatePayload {
  templateName: string;
  languageCode?: string;
  bodyParameters?: string[];
  headerParameters?: string[];
  /** Public HTTPS URL for Meta template IMAGE header */
  headerImageLink?: string;
}

export interface MetaTextPayload {
  text: string;
}

export interface MetaInteractiveCtaPayload {
  url: string;
  headerText?: string;
  bodyText?: string;
  footerText?: string;
  buttonText?: string;
}
