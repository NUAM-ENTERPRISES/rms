import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { RecruiterAssignmentService } from '../candidates/services/recruiter-assignment.service';
import { CandidateCodeService } from '../candidates/services/candidate-code.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SystemConfigService } from '../system-config/system-config.service';

jest.mock('nanoid', () => ({ nanoid: () => 'mocked-nanoid' }));

import { MetaService } from './meta.service';

describe('MetaService listMetaLeads', () => {
  let service: MetaService;

  const mockPrisma = {
    metaLead: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetaService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RecruiterAssignmentService, useValue: {} },
        { provide: CandidateCodeService, useValue: {} },
        { provide: NotificationsService, useValue: {} },
        {
          provide: SystemConfigService,
          useValue: {
            getLeadgenChannelsSettings: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(MetaService);
  });

  it('returns paginated MetaLead history with displayName and platformCounts', async () => {
    mockPrisma.metaLead.count
      .mockResolvedValueOnce(1) // filtered total
      .mockResolvedValueOnce(5) // platformCounts.total
      .mockResolvedValueOnce(1) // meta
      .mockResolvedValueOnce(1) // instagram
      .mockResolvedValueOnce(1) // messenger
      .mockResolvedValueOnce(2); // whatsapp
    mockPrisma.metaLead.findMany.mockResolvedValue([
      {
        id: 'ml-1',
        leadId: 'lead-1',
        formId: null,
        fullName: null,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        countryCode: '+91',
        phoneNumber: '9876543210',
        status: 'pending',
        platform: 'whatsapp',
        source: 'meta',
        shortCode: 'abc123',
        senderId: 'wa-1',
        candidateId: null,
        processingNote: null,
        formSubmissionTime: null,
        createdAt: new Date('2026-08-01T10:00:00.000Z'),
        processedAt: null,
        candidate: null,
      },
    ]);

    const result = await service.listMetaLeads({ page: 1, limit: 20 });

    expect(mockPrisma.metaLead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ erasedAt: null }] },
        skip: 0,
        take: 20,
      }),
    );
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    expect(result.platformCounts).toEqual({
      total: 5,
      meta: 1,
      instagram: 1,
      messenger: 1,
      whatsapp: 2,
    });
    expect(result.items[0].displayName).toBe('Jane Doe');
  });

  it('applies status, platform, and search filters', async () => {
    mockPrisma.metaLead.count.mockResolvedValue(0);
    mockPrisma.metaLead.findMany.mockResolvedValue([]);

    await service.listMetaLeads({
      page: 2,
      limit: 10,
      status: 'linked',
      platform: 'instagram',
      search: 'jane',
    });

    expect(mockPrisma.metaLead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              AND: [
                { erasedAt: null },
                { status: 'linked' },
                { OR: expect.any(Array) },
              ],
            },
            {
              platform: { equals: 'instagram', mode: 'insensitive' },
            },
          ],
        },
        skip: 10,
        take: 10,
      }),
    );
  });

  it('maps messenger filter to facebook platform', async () => {
    mockPrisma.metaLead.count.mockResolvedValue(0);
    mockPrisma.metaLead.findMany.mockResolvedValue([]);

    await service.listMetaLeads({ platform: 'messenger' });

    expect(mockPrisma.metaLead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { AND: [{ erasedAt: null }] },
            {
              platform: { equals: 'facebook', mode: 'insensitive' },
            },
          ],
        },
      }),
    );
  });

  it('filters meta lead ads with null/meta platform', async () => {
    mockPrisma.metaLead.count.mockResolvedValue(0);
    mockPrisma.metaLead.findMany.mockResolvedValue([]);

    await service.listMetaLeads({ platform: 'meta' });

    expect(mockPrisma.metaLead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { AND: [{ erasedAt: null }] },
            {
              OR: [
                { platform: null },
                { platform: { equals: 'meta', mode: 'insensitive' } },
              ],
            },
          ],
        },
      }),
    );
  });
});
