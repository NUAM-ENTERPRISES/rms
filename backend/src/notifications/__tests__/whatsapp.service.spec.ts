import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from '../whatsapp.service';

describe('WhatsAppService.buildTemplateComponents', () => {
  let service: WhatsAppService;

  beforeEach(() => {
    const configService = {
      get: jest.fn().mockReturnValue({
        enabled: true,
        phoneNumberId: '123',
        accessToken: 'token',
        apiUrl: 'https://graph.facebook.com/v22.0/',
      }),
    };
    service = new WhatsAppService(configService as unknown as ConfigService);
  });

  it('builds IMAGE header + body when headerImageLink is set', () => {
    const components = service.buildTemplateComponents({
      to: '919876543210',
      templateName: 'candidate_status_deployed',
      headerImageLink: 'https://cdn.example.com/header.jpg',
      bodyParameters: ['Anil'],
    });

    expect(components).toEqual([
      {
        type: 'header',
        parameters: [
          {
            type: 'image',
            image: { link: 'https://cdn.example.com/header.jpg' },
          },
        ],
      },
      {
        type: 'body',
        parameters: [{ type: 'text', text: 'Anil' }],
      },
    ]);
  });

  it('prefers IMAGE header over text headerParameters', () => {
    const components = service.buildTemplateComponents({
      to: '919876543210',
      templateName: 'candidate_status_deployed',
      headerImageLink: 'https://cdn.example.com/header.jpg',
      headerParameters: ['ignored'],
      bodyParameters: ['Anil'],
    });

    expect(components[0]).toEqual({
      type: 'header',
      parameters: [
        {
          type: 'image',
          image: { link: 'https://cdn.example.com/header.jpg' },
        },
      ],
    });
  });

  it('builds text header when only headerParameters are set', () => {
    const components = service.buildTemplateComponents({
      to: '919876543210',
      templateName: 'hello_world',
      headerParameters: ['Affiniks'],
      bodyParameters: ['Hi'],
    });

    expect(components[0]).toEqual({
      type: 'header',
      parameters: [{ type: 'text', text: 'Affiniks' }],
    });
  });
});
