import { Test } from '@nestjs/testing';
import { ProcessingService } from '../processing.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { HrdRemindersService } from '../../hrd-reminders/hrd-reminders.service';
import { DataFlowRemindersService } from '../../data-flow-reminders/data-flow-reminders.service';

describe('ProcessingService - getDocumentReceivedRequirements', () => {
  let service: ProcessingService;
  let prisma: any;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProcessingService,
        PrismaService,
        OutboxService,
        { provide: HrdRemindersService, useValue: { createHRDReminder: jest.fn() } },
        { provide: DataFlowRemindersService, useValue: { createDataFlowReminder: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(ProcessingService);
    prisma = moduleRef.get(PrismaService);

    jest
      .spyOn(service, 'createStepsForProcessingCandidate' as any)
      .mockResolvedValue(undefined);
  });

  function mockBaseRequirements() {
    const pcId = 'pc-1';
    const template = { id: 'tpl-doc-received', key: 'document_received' };

    jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue({
      id: pcId,
      processingStatus: 'in_progress',
      candidate: {
        id: 'cand-1',
        firstName: 'A',
        lastName: 'B',
        email: 'a@example.com',
        mobileNumber: 'x',
        countryCode: 'SA',
      },
      project: { id: 'proj-1', title: 'P', countryCode: 'SA' },
      role: null,
    });

    jest.spyOn(prisma.processingStepTemplate, 'findUnique' as any).mockResolvedValue(template);

    jest.spyOn(prisma.countryDocumentRequirement, 'findMany' as any).mockResolvedValue([
      {
        countryCode: 'ALL',
        docType: 'passport',
        label: 'Passport',
        mandatory: true,
      },
    ]);

    jest.spyOn(prisma.processingStep, 'findFirst' as any).mockResolvedValue({
      id: 'step-1',
      status: 'pending',
      documents: [],
      template,
    });

    jest.spyOn(prisma.document, 'findMany' as any).mockResolvedValue([]);

    return { pcId };
  }

  it('includes merged document and locker number when collection exists', async () => {
    const { pcId } = mockBaseRequirements();

    jest.spyOn(prisma.originalDocumentCollection, 'findUnique' as any).mockResolvedValue({
      id: 'col-1',
      status: 'locker_submitted',
      lockerFileNumber: 'L-100',
      mergedDocument: {
        id: 'doc-merge-1',
        fileName: 'combined-originals.pdf',
        fileUrl: 'https://cdn.example.com/combined-originals.pdf',
        mimeType: 'application/pdf',
      },
    });

    const res = await service.getDocumentReceivedRequirements(pcId);

    expect(res.originalDocumentCollection).toEqual({
      id: 'col-1',
      status: 'locker_submitted',
      lockerFileNumber: 'L-100',
      mergedDocument: {
        id: 'doc-merge-1',
        fileName: 'combined-originals.pdf',
        fileUrl: 'https://cdn.example.com/combined-originals.pdf',
        mimeType: 'application/pdf',
      },
    });
  });

  it('returns null mergedDocument when collection has no file URL', async () => {
    const { pcId } = mockBaseRequirements();

    jest.spyOn(prisma.originalDocumentCollection, 'findUnique' as any).mockResolvedValue({
      id: 'col-2',
      status: 'draft',
      lockerFileNumber: null,
      mergedDocument: null,
    });

    const res = await service.getDocumentReceivedRequirements(pcId);

    expect(res.originalDocumentCollection).toEqual({
      id: 'col-2',
      status: 'draft',
      lockerFileNumber: null,
      mergedDocument: null,
    });
  });

  it('returns null originalDocumentCollection when candidate has no collection', async () => {
    const { pcId } = mockBaseRequirements();

    jest.spyOn(prisma.originalDocumentCollection, 'findUnique' as any).mockResolvedValue(null);

    const res = await service.getDocumentReceivedRequirements(pcId);

    expect(res.originalDocumentCollection).toBeNull();
  });
});
