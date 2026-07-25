import { ConfigService } from '@nestjs/config';
import { FacebookChannelAdapter } from '../channels/facebook.channel-adapter';
import { InstagramChannelAdapter } from '../channels/instagram.channel-adapter';
import { WhatsAppChannelAdapter } from '../channels/whatsapp.channel-adapter';
import { MetaGraphClient } from '../meta-graph.client';

describe('Channel adapters', () => {
  describe('WhatsAppChannelAdapter', () => {
    const whatsappService = {
      sendTemplateMessage: jest.fn(),
    };
    const graphClient = {
      getWhatsAppPhoneNumberId: jest.fn().mockReturnValue('phone-id'),
      getWhatsAppAccessToken: jest.fn().mockReturnValue('token'),
      getGraphVersion: jest.fn().mockReturnValue('v21.0'),
      post: jest.fn(),
    };

    let adapter: WhatsAppChannelAdapter;

    beforeEach(() => {
      jest.clearAllMocks();
      adapter = new WhatsAppChannelAdapter(
        whatsappService as any,
        graphClient as any,
      );
    });

    it('sends templates via WhatsAppService and throws on failure', async () => {
      whatsappService.sendTemplateMessage.mockResolvedValue({
        success: true,
        messageId: 'wamid.ok',
      });

      const ok = await adapter.send({
        channel: 'whatsapp',
        kind: 'template',
        to: '919876543210',
        payload: {
          templateName: 'candidate_status_qualified',
          bodyParameters: ['Jane', 'Qualified'],
        },
        idempotencyKey: 'k1',
      });

      expect(ok.messageId).toBe('wamid.ok');
      expect(whatsappService.sendTemplateMessage).toHaveBeenCalledWith({
        to: '919876543210',
        templateName: 'candidate_status_qualified',
        languageCode: 'en_US',
        bodyParameters: ['Jane', 'Qualified'],
        headerParameters: undefined,
        headerImageLink: undefined,
      });

      whatsappService.sendTemplateMessage.mockResolvedValue({
        success: false,
        message: 'template not approved',
      });

      await expect(
        adapter.send({
          channel: 'whatsapp',
          kind: 'template',
          to: '919876543210',
          payload: { templateName: 'candidate_status_qualified' },
          idempotencyKey: 'k2',
        }),
      ).rejects.toThrow('template not approved');
    });

    it('sends text via Meta Graph client', async () => {
      graphClient.post.mockResolvedValue({
        messages: [{ id: 'wamid.text' }],
      });

      const result = await adapter.send({
        channel: 'whatsapp',
        kind: 'text',
        to: '919876543210',
        payload: { text: 'Hello' },
        idempotencyKey: 'k3',
      });

      expect(result.messageId).toBe('wamid.text');
      expect(graphClient.post).toHaveBeenCalled();
    });
  });

  describe('FacebookChannelAdapter', () => {
    it('posts text messages to Messenger Graph API', async () => {
      const graphClient = {
        getPageAccessToken: jest.fn().mockReturnValue('page-token'),
        getGraphVersion: jest.fn().mockReturnValue('v21.0'),
        post: jest.fn().mockResolvedValue({ message_id: 'm1' }),
      };
      const adapter = new FacebookChannelAdapter(graphClient as any);

      const result = await adapter.send({
        channel: 'facebook',
        kind: 'text',
        to: 'fb-1',
        payload: { text: 'Hi' },
        idempotencyKey: 'fb-1',
      });

      expect(result.success).toBe(true);
      expect(graphClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/me/messages'),
        {
          recipient: { id: 'fb-1' },
          message: { text: 'Hi' },
        },
      );
    });
  });

  describe('InstagramChannelAdapter', () => {
    it('posts text messages with messaging_product instagram', async () => {
      const graphClient = {
        getPageAccessToken: jest.fn().mockReturnValue('page-token'),
        getGraphVersion: jest.fn().mockReturnValue('v21.0'),
        post: jest.fn().mockResolvedValue({ message_id: 'ig1' }),
      };
      const adapter = new InstagramChannelAdapter(graphClient as any);

      await adapter.send({
        channel: 'instagram',
        kind: 'text',
        to: 'ig-1',
        payload: { text: 'Hi IG' },
        idempotencyKey: 'ig-1',
      });

      expect(graphClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/me/messages'),
        expect.objectContaining({
          recipient: { id: 'ig-1' },
          messaging_product: 'instagram',
        }),
      );
    });
  });

  describe('MetaGraphClient', () => {
    it('reads WhatsApp config from nested whatsapp config', () => {
      const configService = {
        get: jest.fn((key: string) => {
          if (key === 'whatsapp') {
            return { accessToken: 'wa-token', phoneNumberId: 'wa-phone' };
          }
          if (key === 'META_GRAPH_VERSION') return 'v22.0';
          return undefined;
        }),
      } as unknown as ConfigService;

      const client = new MetaGraphClient(configService);
      expect(client.getWhatsAppAccessToken()).toBe('wa-token');
      expect(client.getWhatsAppPhoneNumberId()).toBe('wa-phone');
      expect(client.getGraphVersion()).toBe('v22.0');
    });
  });
});
