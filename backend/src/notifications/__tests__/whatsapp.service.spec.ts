import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WHATSAPP_TEMPLATE_TYPES } from '../../common/constants/whatsapp-templates';
import { WhatsAppService } from '../whatsapp.service';

describe('WhatsAppService', () => {
  let service: WhatsAppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              enabled: false,
              phoneNumberId: '123',
              accessToken: 'token',
            }),
          },
        },
      ],
    }).compile();

    service = module.get<WhatsAppService>(WhatsAppService);
  });

  it('resolves candidate status templates', () => {
    expect(service.getTemplateForCandidateStatus('Interested')).toBe(
      WHATSAPP_TEMPLATE_TYPES.HELLO_WORLD,
    );
    expect(service.isCandidateStatusNotifiable('visa')).toBe(true);
    expect(service.isCandidateStatusNotifiable('Qualified')).toBe(false);
  });

  it('skips send when status has no mapped template', async () => {
    const result = await service.sendCandidateStatusNotification({
      phoneNumber: '919876543210',
      candidateName: 'Rajesh Kumar',
      statusName: 'Qualified',
    });

    expect(result).toEqual({
      success: false,
      message: 'No WhatsApp template mapped for status: Qualified',
    });
  });
});
