import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MetaService } from './meta.service';
import { PrismaService } from 'src/database/prisma.service';
import { RecruiterAssignmentService } from '../candidates/services/recruiter-assignment.service';
import { CandidateCodeService } from '../candidates/services/candidate-code.service';

describe('MetaService', () => {
  let service: MetaService;
  let prisma: {
    metaLead: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      metaLead: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetaService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: RecruiterAssignmentService,
          useValue: {},
        },
        {
          provide: CandidateCodeService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'whatsapp.phoneNumberId') return '123456';
              if (key === 'whatsapp.accessToken') return 'test-token';
              if (key === 'whatsapp.apiUrl') {
                return 'https://graph.facebook.com/v22.0/';
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MetaService>(MetaService);
    process.env.WEB_URL = 'https://app.example.com';
    process.env.CORS_ORIGIN = 'https://app.example.com';
    process.env.META_PAGE_ACCESS_TOKEN = 'page-token';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('processes whatsapp inbound text and falls back to plain text when interactive send fails', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementation(async (_url: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? '{}'));

        if (body.type === 'interactive') {
          return new Response(
            JSON.stringify({
              error: { message: 'Interactive message rejected' },
            }),
            { status: 400 },
          );
        }

        return new Response(JSON.stringify({ messages: [{ id: 'wamid.test' }] }), {
          status: 200,
        });
      });

    await service.processWebhook({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: '123456' },
                messages: [
                  {
                    from: '919876543210',
                    type: 'text',
                    text: { body: 'hi' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(prisma.metaLead.create).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const fallbackCall = fetchMock.mock.calls[1]?.[1];
    const fallbackBody = JSON.parse(String(fallbackCall?.body ?? '{}'));
    expect(fallbackBody.type).toBe('text');
    expect(fallbackBody.text.body).toContain('https://app.example.com/register/');
  });

  it('routes instagram page messaging events with messaging_product=instagram', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ message_id: 'mid.test' }), { status: 200 }),
      );

    await service.processWebhook({
      object: 'page',
      entry: [
        {
          messaging: [
            {
              messaging_product: 'instagram',
              sender: { id: 'ig-user-1' },
              message: { text: 'hello' },
            },
          ],
        },
      ],
    });

    expect(prisma.metaLead.create).toHaveBeenCalled();
    const call = fetchMock.mock.calls[0]?.[1];
    const body = JSON.parse(String(call?.body ?? '{}'));
    expect(body.messaging_product).toBe('instagram');
  });
});
