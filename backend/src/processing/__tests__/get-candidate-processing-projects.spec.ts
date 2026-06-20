import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProcessingService } from '../processing.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { ProcessingRemindersService } from '../../processing-reminders/processing-reminders.service';
import { CandidateProjectsService } from '../../candidate-projects/candidate-projects.service';

describe('ProcessingService - getCandidateProcessingProjects', () => {
  let service: ProcessingService;
  let prisma: any;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProcessingService,
        PrismaService,
        { provide: OutboxService, useValue: {} },
        { provide: ProcessingRemindersService, useValue: {} },
        { provide: CandidateProjectsService, useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(ProcessingService);
    prisma = moduleRef.get(PrismaService);
  });

  it('throws NotFoundException when candidate does not exist', async () => {
    jest.spyOn(prisma.candidate, 'findUnique' as any).mockResolvedValue(null);

    await expect(
      service.getCandidateProcessingProjects('missing-candidate'),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns empty list and summary when candidate has no processing records', async () => {
    jest.spyOn(prisma.candidate, 'findUnique' as any).mockResolvedValue({ id: 'cand-1' });
    jest.spyOn(prisma.processingCandidate, 'findMany' as any).mockResolvedValue([]);

    const result = await service.getCandidateProcessingProjects('cand-1', {
      currentProcessingId: 'pc-current',
    });

    expect(result.items).toEqual([]);
    expect(result.summary).toEqual({
      totalProjects: 0,
      previousProjectsCount: 0,
      hasPreviousProcessing: false,
    });
    expect(result.pagination.total).toBe(0);
  });

  it('sorts current record first and enriches project country flags', async () => {
    jest.spyOn(prisma.candidate, 'findUnique' as any).mockResolvedValue({ id: 'cand-1' });
    jest.spyOn(prisma.processingCandidate, 'findMany' as any).mockResolvedValue([
      {
        id: 'pc-old',
        processingStatus: 'completed',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        project: {
          id: 'proj-old',
          title: 'Older Project',
          countryCode: 'US',
          country: { code: 'US', name: 'United States' },
        },
        role: {
          id: 'role-1',
          designation: 'Nurse',
          roleCatalog: { name: 'Registered Nurse' },
        },
      },
      {
        id: 'pc-current',
        processingStatus: 'in_progress',
        createdAt: new Date('2025-06-01T00:00:00.000Z'),
        project: {
          id: 'proj-current',
          title: 'Current Project',
          countryCode: 'SA',
          country: { code: 'SA', name: 'Saudi Arabia' },
        },
        role: {
          id: 'role-2',
          designation: 'Lab Tech',
          roleCatalog: { name: 'Laboratory Technician' },
        },
      },
    ]);

    const result = await service.getCandidateProcessingProjects('cand-1', {
      currentProcessingId: 'pc-current',
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0].id).toBe('pc-current');
    expect(result.items[0].isCurrent).toBe(true);
    expect(result.items[1].id).toBe('pc-old');
    expect(result.items[1].isCurrent).toBe(false);
    const currentCountry = result.items[0].project.country as { flag?: string; flagName?: string } | null;
    expect(currentCountry?.flag).toBeTruthy();
    expect(currentCountry?.flagName).toContain('Saudi Arabia');
    expect(result.summary).toEqual({
      totalProjects: 2,
      previousProjectsCount: 1,
      hasPreviousProcessing: true,
    });
  });

  it('paginates results after sorting', async () => {
    jest.spyOn(prisma.candidate, 'findUnique' as any).mockResolvedValue({ id: 'cand-1' });
    jest.spyOn(prisma.processingCandidate, 'findMany' as any).mockResolvedValue([
      {
        id: 'pc-1',
        processingStatus: 'completed',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        project: { id: 'p1', title: 'P1', countryCode: null, country: null },
        role: { id: 'r1', designation: 'Role 1', roleCatalog: null },
      },
      {
        id: 'pc-2',
        processingStatus: 'completed',
        createdAt: new Date('2024-02-01T00:00:00.000Z'),
        project: { id: 'p2', title: 'P2', countryCode: null, country: null },
        role: { id: 'r2', designation: 'Role 2', roleCatalog: null },
      },
      {
        id: 'pc-3',
        processingStatus: 'assigned',
        createdAt: new Date('2024-03-01T00:00:00.000Z'),
        project: { id: 'p3', title: 'P3', countryCode: null, country: null },
        role: { id: 'r3', designation: 'Role 3', roleCatalog: null },
      },
    ]);

    const result = await service.getCandidateProcessingProjects('cand-1', {
      page: 2,
      limit: 1,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('pc-2');
    expect(result.pagination).toEqual({
      page: 2,
      limit: 1,
      total: 3,
      totalPages: 3,
    });
  });
});
