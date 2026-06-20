import { Test } from '@nestjs/testing';
import { ProcessingService } from '../processing.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { ProcessingRemindersService } from '../../processing-reminders/processing-reminders.service';
import { ConflictException } from '@nestjs/common';

describe('ProcessingService - step requirement rules', () => {
  let service: ProcessingService;
  let prisma: any;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProcessingService,
        PrismaService,
        OutboxService,
        { provide: ProcessingRemindersService, useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(ProcessingService);
    prisma = moduleRef.get(PrismaService);
  });

  it('creates a country-step requirement using canonical doc type', async () => {
    jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue({
      id: 'pc-1',
      candidate: { countryCode: 'IN' },
      project: { countryCode: 'IN' },
    });
    jest.spyOn(prisma.processingStepTemplate, 'findUnique' as any).mockResolvedValue({
      id: 'tmpl-hrd',
      key: 'hrd',
      label: 'HRD',
    });
    jest.spyOn(prisma.countryDocumentRequirement, 'findUnique' as any).mockResolvedValue(null);
    const createSpy = jest
      .spyOn(prisma.countryDocumentRequirement, 'create' as any)
      .mockResolvedValue({
        id: 'rule-1',
        countryCode: 'IN',
        processingStepTemplateId: 'tmpl-hrd',
        docType: 'pcc',
        mandatory: true,
      });

    const out = await service.createStepRequirementRule('pc-1', {
      stepKey: 'hrd',
      docType: 'police_clearance',
      mandatory: true,
    });

    expect(out.docType).toBe('pcc');
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          countryCode: 'IN',
          processingStepTemplateId: 'tmpl-hrd',
          docType: 'pcc',
        }),
      }),
    );
  });

  it('prevents duplicate country-step doc rules', async () => {
    jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue({
      id: 'pc-1',
      candidate: { countryCode: 'IN' },
      project: { countryCode: 'IN' },
    });
    jest.spyOn(prisma.processingStepTemplate, 'findUnique' as any).mockResolvedValue({
      id: 'tmpl-hrd',
      key: 'hrd',
      label: 'HRD',
    });
    jest.spyOn(prisma.countryDocumentRequirement, 'findUnique' as any).mockResolvedValue({
      id: 'rule-existing',
    });

    await expect(
      service.createStepRequirementRule('pc-1', {
        stepKey: 'hrd',
        docType: 'degree_certificate',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('merges ALL + country rules and marks country rules editable', async () => {
    jest.spyOn(service, 'createStepsForProcessingCandidate' as any).mockResolvedValue(undefined);
    jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue({
      id: 'pc-1',
      candidate: { countryCode: 'IN' },
      project: { countryCode: 'IN' },
    });
    jest.spyOn(prisma.processingStepTemplate, 'findUnique' as any).mockResolvedValue({
      id: 'tmpl-hrd',
      key: 'hrd',
      label: 'HRD',
    });
    jest.spyOn(prisma.countryDocumentRequirement, 'findMany' as any).mockResolvedValue([
      {
        id: 'all-1',
        countryCode: 'ALL',
        docType: 'degree_certificate',
        label: 'Degree',
        mandatory: true,
      },
      {
        id: 'in-1',
        countryCode: 'IN',
        docType: 'degree_certificate',
        label: 'Degree Certificate',
        mandatory: false,
      },
    ]);

    const out = await service.getStepRequirementRules('pc-1', 'hrd');
    expect(out.rules).toHaveLength(1);
    expect(out.rules[0].sourceCountryCode).toBe('IN');
    expect(out.rules[0].isEditable).toBe(true);
    expect(out.rules[0].mandatory).toBe(false);
    expect(out.rules[0].overridesGlobal).toBe(true);
    expect(out.existingCountryDocTypes).toEqual(['degree_certificate']);
    expect(out.existingGlobalDocTypes).toEqual(['degree_certificate']);
  });

  it('creates a global requirement when scope is global', async () => {
    jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue({
      id: 'pc-1',
      candidate: { countryCode: 'IN' },
      project: { countryCode: 'IN' },
    });
    jest.spyOn(prisma.processingStepTemplate, 'findUnique' as any).mockResolvedValue({
      id: 'tmpl-hrd',
      key: 'hrd',
      label: 'HRD',
    });
    jest.spyOn(prisma.countryDocumentRequirement, 'findUnique' as any).mockResolvedValue(null);
    const createSpy = jest
      .spyOn(prisma.countryDocumentRequirement, 'create' as any)
      .mockResolvedValue({
        id: 'all-rule-1',
        countryCode: 'ALL',
        processingStepTemplateId: 'tmpl-hrd',
        docType: 'pcc',
        mandatory: true,
      });

    const out = await service.createStepRequirementRule('pc-1', {
      stepKey: 'hrd',
      docType: 'pcc',
      mandatory: true,
      scope: 'global',
    });

    expect(out.countryCode).toBe('ALL');
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          countryCode: 'ALL',
          docType: 'pcc',
        }),
      }),
    );
  });

  it('prevents duplicate global doc rules with scope-specific message', async () => {
    jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue({
      id: 'pc-1',
      candidate: { countryCode: 'IN' },
      project: { countryCode: 'IN' },
    });
    jest.spyOn(prisma.processingStepTemplate, 'findUnique' as any).mockResolvedValue({
      id: 'tmpl-hrd',
      key: 'hrd',
      label: 'HRD',
    });
    jest.spyOn(prisma.countryDocumentRequirement, 'findUnique' as any).mockResolvedValue({
      id: 'all-existing',
    });

    await expect(
      service.createStepRequirementRule('pc-1', {
        stepKey: 'hrd',
        docType: 'degree_certificate',
        scope: 'global',
      }),
    ).rejects.toThrow(/global rule/i);
  });

  it('allows country override when only a global rule exists', async () => {
    jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue({
      id: 'pc-1',
      candidate: { countryCode: 'IN' },
      project: { countryCode: 'IN' },
    });
    jest.spyOn(prisma.processingStepTemplate, 'findUnique' as any).mockResolvedValue({
      id: 'tmpl-hrd',
      key: 'hrd',
      label: 'HRD',
    });
    jest.spyOn(prisma.countryDocumentRequirement, 'findUnique' as any).mockResolvedValue(null);
    const createSpy = jest
      .spyOn(prisma.countryDocumentRequirement, 'create' as any)
      .mockResolvedValue({
        id: 'in-rule-1',
        countryCode: 'IN',
        processingStepTemplateId: 'tmpl-hrd',
        docType: 'degree_certificate',
        mandatory: false,
      });

    await service.createStepRequirementRule('pc-1', {
      stepKey: 'hrd',
      docType: 'degree_certificate',
      mandatory: false,
      scope: 'country',
    });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          countryCode: 'IN',
          docType: 'degree_certificate',
        }),
      }),
    );
  });

  it('allows deleting global ALL rules for selected step context', async () => {
    jest.spyOn(prisma.processingCandidate, 'findUnique' as any).mockResolvedValue({
      id: 'pc-1',
      candidate: { countryCode: 'IN' },
      project: { countryCode: 'IN' },
    });
    jest.spyOn(prisma.processingStepTemplate, 'findUnique' as any).mockResolvedValue({
      id: 'tmpl-hrd',
      key: 'hrd',
      label: 'HRD',
    });
    jest.spyOn(prisma.countryDocumentRequirement, 'findUnique' as any).mockResolvedValue({
      id: 'all-1',
      countryCode: 'ALL',
      processingStepTemplateId: 'tmpl-hrd',
      docType: 'degree_certificate',
    });

    const deleteSpy = jest
      .spyOn(prisma.countryDocumentRequirement, 'delete' as any)
      .mockResolvedValue({ id: 'all-1' });

    const out = await service.deleteStepRequirementRule('pc-1', 'all-1', 'hrd');
    expect(deleteSpy).toHaveBeenCalledWith({ where: { id: 'all-1' } });
    expect(out).toEqual({ id: 'all-1', removed: true });
  });
});
