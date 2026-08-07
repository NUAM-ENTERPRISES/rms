import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { SystemConfigService } from '../system-config.service';

describe('SystemConfigService leadgen channels', () => {
  let service: SystemConfigService;

  const prismaMock = {
    systemConfig: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemConfigService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(SystemConfigService);
  });

  it('returns all channels enabled when config is missing', async () => {
    prismaMock.systemConfig.findUnique.mockResolvedValue(null);

    const result = await service.getLeadgenChannelsSettings();

    expect(result).toEqual({
      whatsapp: true,
      instagram: true,
      messenger: true,
      leadgenForms: true,
    });
  });

  it('merges stored config with defaults', async () => {
    prismaMock.systemConfig.findUnique.mockResolvedValue({
      key: 'META_LEADGEN_SETTINGS',
      value: { whatsapp: false },
      isActive: true,
    });

    const result = await service.getLeadgenChannelsSettings();

    expect(result).toEqual({
      whatsapp: false,
      instagram: true,
      messenger: true,
      leadgenForms: true,
    });
  });

  it('persists partial updates merged with current settings', async () => {
    prismaMock.systemConfig.findUnique.mockResolvedValue({
      key: 'META_LEADGEN_SETTINGS',
      value: {
        whatsapp: true,
        instagram: true,
        messenger: true,
        leadgenForms: true,
      },
      isActive: true,
    });
    prismaMock.systemConfig.upsert.mockResolvedValue({});

    await service.updateLeadgenChannelsSettings({ whatsapp: false });

    expect(prismaMock.systemConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'META_LEADGEN_SETTINGS' },
        update: expect.objectContaining({
          value: {
            whatsapp: false,
            instagram: true,
            messenger: true,
            leadgenForms: true,
          },
        }),
        create: expect.objectContaining({
          key: 'META_LEADGEN_SETTINGS',
          value: {
            whatsapp: false,
            instagram: true,
            messenger: true,
            leadgenForms: true,
          },
        }),
      }),
    );
  });
});
