import { Test, TestingModule } from '@nestjs/testing';
import { AFFINIKS_OFFICE_ADDRESSES_KEY } from '../../courier-shipments/constants/shipment-types';
import { PrismaService } from '../../database/prisma.service';
import { SystemConfigService } from '../system-config.service';

describe('SystemConfigService office addresses', () => {
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

  it('returns default office addresses when config is missing', async () => {
    prismaMock.systemConfig.findUnique.mockResolvedValue(null);

    const result = await service.getOfficeAddresses();

    expect(result.kochi.label).toBe('Kochi Office');
    expect(result.delhi.label).toBe('Delhi Office');
    expect(result.kochi.addressCountryCode).toBe('IN');
  });

  it('merges stored config with defaults', async () => {
    prismaMock.systemConfig.findUnique.mockResolvedValue({
      key: AFFINIKS_OFFICE_ADDRESSES_KEY,
      value: {
        kochi: {
          label: 'Updated Kochi',
          address: 'New Kochi Address',
        },
      },
    });

    const result = await service.getOfficeAddresses();

    expect(result.kochi.label).toBe('Updated Kochi');
    expect(result.kochi.address).toBe('New Kochi Address');
    expect(result.kochi.pincode).toBe('682016');
    expect(result.delhi.label).toBe('Delhi Office');
  });

  it('persists valid Kochi and Delhi office updates', async () => {
    prismaMock.systemConfig.upsert.mockResolvedValue({});

    const payload = {
      kochi: {
        label: 'Kochi HQ',
        address: 'Updated Kochi Office, MG Road',
        addressCountryCode: 'IN',
        addressStateId: null,
        pincode: '682016',
        phone: '+91 484 111 1111',
        altPhone: '+91 484 222 2222',
      },
      delhi: {
        label: 'Delhi HQ',
        address: 'Updated Delhi Office, CP',
        addressCountryCode: 'IN',
        addressStateId: null,
        pincode: '110001',
        phone: '+91 11 1111 1111',
        altPhone: '+91 11 2222 2222',
      },
    };

    const result = await service.updateOfficeAddresses(payload);

    expect(prismaMock.systemConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: AFFINIKS_OFFICE_ADDRESSES_KEY },
        update: expect.objectContaining({
          value: payload,
        }),
      }),
    );
    expect(result.kochi.label).toBe('Kochi HQ');
    expect(result.delhi.label).toBe('Delhi HQ');
  });
});
