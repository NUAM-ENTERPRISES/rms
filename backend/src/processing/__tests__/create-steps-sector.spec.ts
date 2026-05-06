import { Test } from '@nestjs/testing';
import { ProcessingService } from '../processing.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { ProcessingRemindersService } from '../../processing-reminders/processing-reminders.service';
import { PROJECT_SECTOR } from '../../projects/constants';
import { PROCESSING_STEP_SECTOR_MISMATCH_REASON } from '../processing-sector-steps';

describe('ProcessingService - createStepsForProcessingCandidate sector', () => {
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
  });

  it('creates only sector-allowed templates and cancels disallowed pending steps', async () => {
    const pcFull = {
      id: 'pc-1',
      candidate: { countryCode: 'SA' },
      project: { countryCode: 'SA', sector: PROJECT_SECTOR.NON_HEALTHCARE },
    };
    let findUniqueCalls = 0;
    jest.spyOn(prisma.processingCandidate, 'findUnique').mockImplementation(() => {
      findUniqueCalls += 1;
      if (findUniqueCalls === 1) return Promise.resolve(pcFull);
      return Promise.resolve({ id: 'pc-1', processingStatus: 'assigned' });
    });

    jest.spyOn(prisma.processingCountryStep, 'findMany').mockResolvedValue([]);
    jest.spyOn(prisma.processingStepTemplate, 'findMany').mockResolvedValue([
      { id: 't-offer', key: 'offer_letter', order: 1 },
      { id: 't-df', key: 'data_flow', order: 2 },
    ]);

    jest.spyOn(prisma.processingStep, 'findMany').mockResolvedValue([
      { id: 's-bad', templateId: 't-df', status: 'pending', template: { key: 'data_flow' } },
    ]);

    jest.spyOn(prisma.processingStep, 'findFirst').mockResolvedValue(null);

    const create = jest.spyOn(prisma.processingStep, 'create').mockResolvedValue({} as any);
    const update = jest.spyOn(prisma.processingStep, 'update').mockResolvedValue({} as any);

    await service.createStepsForProcessingCandidate('pc-1');

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ templateId: 't-offer' }),
      }),
    );
    expect(create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ templateId: 't-df' }),
      }),
    );
    expect(update).toHaveBeenCalledWith({
      where: { id: 's-bad' },
      data: {
        status: 'cancelled',
        rejectionReason: PROCESSING_STEP_SECTOR_MISMATCH_REASON,
      },
    });
  });

  it('restores sector-mismatch cancelled steps when the template key is allowed again', async () => {
    const pcFull = {
      id: 'pc-1',
      candidate: { countryCode: 'SA' },
      project: { countryCode: 'SA', sector: PROJECT_SECTOR.HEALTHCARE },
    };
    let findUniqueCalls = 0;
    jest.spyOn(prisma.processingCandidate, 'findUnique').mockImplementation(() => {
      findUniqueCalls += 1;
      if (findUniqueCalls === 1) return Promise.resolve(pcFull);
      return Promise.resolve({ id: 'pc-1', processingStatus: 'assigned' });
    });

    jest.spyOn(prisma.processingCountryStep, 'findMany').mockResolvedValue([]);
    jest.spyOn(prisma.processingStepTemplate, 'findMany').mockResolvedValue([
      { id: 't-med', key: 'medical', order: 5 },
    ]);

    jest.spyOn(prisma.processingStep, 'findMany').mockResolvedValue([
      {
        id: 's-med',
        templateId: 't-med',
        status: 'cancelled',
        rejectionReason: PROCESSING_STEP_SECTOR_MISMATCH_REASON,
        template: { key: 'medical' },
      },
    ]);

    jest.spyOn(prisma.processingStep, 'findFirst').mockImplementation((args: { where?: Record<string, unknown> }) => {
      const w = args?.where;
      if (w?.status === 'in_progress') return Promise.resolve(null);
      if (w?.templateId === 't-med') return Promise.resolve({ id: 's-med', templateId: 't-med' });
      return Promise.resolve(null);
    });

    const create = jest.spyOn(prisma.processingStep, 'create').mockResolvedValue({} as any);
    const update = jest.spyOn(prisma.processingStep, 'update').mockResolvedValue({} as any);

    await service.createStepsForProcessingCandidate('pc-1');

    expect(update).toHaveBeenCalledWith({
      where: { id: 's-med' },
      data: {
        status: 'pending',
        rejectionReason: null,
      },
    });
    expect(create).not.toHaveBeenCalled();
  });
});
