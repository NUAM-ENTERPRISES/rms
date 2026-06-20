import { Test } from '@nestjs/testing';
import { ProcessingService } from '../processing.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { ProcessingRemindersService } from '../../processing-reminders/processing-reminders.service';
import { PROJECT_SECTOR } from '../../projects/constants';

describe('ProcessingService - getProcessingDetailsById progressCount', () => {
  let service: ProcessingService;
  let prisma: any;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProcessingService,
        PrismaService,
        { provide: OutboxService, useValue: {} },
        { provide: ProcessingRemindersService, useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(ProcessingService);
    prisma = moduleRef.get(PrismaService);

    jest.spyOn(prisma.originalDocumentCollection, 'findUnique' as any).mockResolvedValue(null);
  });

  it('returns progressCount from sector-applicable steps only (healthcare)', async () => {
    const proc = {
      id: 'pc-1',
      candidateId: 'cand-1',
      projectId: 'proj-1',
      role: { id: 'r-1' },
      project: {
        sector: PROJECT_SECTOR.HEALTHCARE,
        country: { code: 'US', name: 'United States' },
      },
      updatedAt: new Date(),
    };

    jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue(proc);

    const stepRows = [
      { status: 'completed', template: { key: 'offer_letter' } },
      { status: 'completed', template: { key: 'hrd' } },
      { status: 'pending', template: { key: 'data_flow' } },
      { status: 'pending', template: { key: 'visa' } },
    ];
    jest.spyOn(prisma.processingStep, 'findMany' as any).mockResolvedValue(stepRows);

    const result = await service.getProcessingDetailsById('pc-1');

    expect(result).toBeDefined();
    expect(result.progressCount).toBe(50);
  });

  it('excludes non-healthcare-disallowed steps from progress denominator', async () => {
    const proc = {
      id: 'pc-1',
      candidateId: 'cand-1',
      projectId: 'proj-1',
      role: { id: 'r-1' },
      project: {
        sector: PROJECT_SECTOR.NON_HEALTHCARE,
        country: { code: 'SA', name: 'Saudi Arabia' },
      },
      updatedAt: new Date(),
    };

    jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue(proc);

    const stepRows = [
      { status: 'completed', template: { key: 'offer_letter' } },
      { status: 'pending', template: { key: 'hrd' } },
      { status: 'pending', template: { key: 'data_flow' } },
      { status: 'pending', template: { key: 'prometric' } },
    ];
    jest.spyOn(prisma.processingStep, 'findMany' as any).mockResolvedValue(stepRows);

    const result = await service.getProcessingDetailsById('pc-1');

    expect(result.progressCount).toBe(50);
  });

  it('forces progressCount to 100 when processingStatus is completed', async () => {
    const proc = {
      id: 'pc-1',
      candidateId: 'cand-1',
      projectId: 'proj-1',
      role: { id: 'r-1' },
      project: {
        sector: PROJECT_SECTOR.HEALTHCARE,
        country: { code: 'US', name: 'United States' },
      },
      updatedAt: new Date(),
      processingStatus: 'completed',
    };

    jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue(proc);

    const stepRows = [
      { status: 'completed', template: { key: 'offer_letter' } },
      { status: 'pending', template: { key: 'hrd' } },
    ];
    jest.spyOn(prisma.processingStep, 'findMany' as any).mockResolvedValue(stepRows);

    const result = await service.getProcessingDetailsById('pc-1');

    expect(result).toBeDefined();
    expect(result.progressCount).toBe(100);
  });

  it('includes original document collection summary and document received step', async () => {
    const proc = {
      id: 'pc-1',
      candidateId: 'cand-1',
      projectId: 'proj-1',
      role: { id: 'r-1' },
      project: {
        sector: PROJECT_SECTOR.HEALTHCARE,
        country: { code: 'SA', name: 'Saudi Arabia' },
      },
      updatedAt: new Date(),
    };

    jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue(proc);

    const stepRows = [
      { status: 'in_progress', template: { key: 'document_received' } },
      { status: 'completed', template: { key: 'offer_letter' } },
    ];
    jest.spyOn(prisma.processingStep, 'findMany' as any).mockResolvedValue(stepRows);

    jest.spyOn(prisma.originalDocumentCollection, 'findUnique' as any).mockResolvedValue({
      id: 'col-1',
      status: 'locker_submitted',
      lockerFileNumber: 'L-200',
      mergedDocument: {
        id: 'doc-merge-1',
        fileName: 'combined.pdf',
        fileUrl: 'https://cdn.example.com/combined.pdf',
        mimeType: 'application/pdf',
      },
    });

    const result = await service.getProcessingDetailsById('pc-1');

    expect(result.originalDocumentCollection).toEqual({
      id: 'col-1',
      status: 'locker_submitted',
      lockerFileNumber: 'L-200',
      mergedDocument: {
        id: 'doc-merge-1',
        fileName: 'combined.pdf',
        fileUrl: 'https://cdn.example.com/combined.pdf',
        mimeType: 'application/pdf',
      },
    });
    expect(result.documentReceivedStep).toEqual({
      status: 'in_progress',
      templateKey: 'document_received',
    });
  });
});
