import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkExperienceService } from '../work-experience.service';

describe('WorkExperienceService countryCode', () => {
  const prisma = {
    candidate: { findUnique: jest.fn(), update: jest.fn() },
    roleCatalog: { findUnique: jest.fn() },
    country: { findUnique: jest.fn() },
    $transaction: jest.fn(),
    workExperience: {
      updateMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  let service: WorkExperienceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkExperienceService(prisma as any);
    prisma.candidate.findUnique.mockResolvedValue({ id: 'cand-1' });
    prisma.candidate.update.mockResolvedValue({ id: 'cand-1' });
    prisma.workExperience.updateMany.mockResolvedValue({ count: 0 });
    prisma.workExperience.findMany.mockResolvedValue([]);
  });

  const baseDto = {
    candidateId: 'cand-1',
    jobTitle: 'Nurse',
    startDate: '2020-01-01T00:00:00.000Z',
  };

  it('creates without countryCode when omitted', async () => {
    prisma.workExperience.create.mockResolvedValue({ id: 'we-1' });

    await service.create(baseDto as any);

    expect(prisma.country.findUnique).not.toHaveBeenCalled();
    expect(prisma.workExperience.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ countryCode: null }),
      }),
    );
  });

  it('creates with valid countryCode', async () => {
    prisma.country.findUnique.mockResolvedValue({ code: 'IN' });
    prisma.workExperience.create.mockResolvedValue({ id: 'we-1' });

    await service.create({ ...baseDto, countryCode: 'IN' } as any);

    expect(prisma.workExperience.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ countryCode: 'IN' }),
      }),
    );
  });

  it('rejects invalid countryCode on create', async () => {
    prisma.country.findUnique.mockResolvedValue(null);

    await expect(
      service.create({ ...baseDto, countryCode: 'ZZ' } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('clears countryCode on update with null', async () => {
    prisma.workExperience.findUnique.mockResolvedValue({
      id: 'we-1',
      candidateId: 'cand-1',
    });
    prisma.workExperience.update.mockResolvedValue({ id: 'we-1' });

    await service.update('we-1', { countryCode: null } as any);

    expect(prisma.workExperience.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ countryCode: null }),
      }),
    );
  });

  it('requires role catalog only when roleCatalogId is provided', async () => {
    prisma.country.findUnique.mockResolvedValue({ code: 'IN' });
    prisma.roleCatalog.findUnique.mockResolvedValue({ id: 'role-1' });
    prisma.workExperience.create.mockResolvedValue({ id: 'we-1' });

    await service.create({
      ...baseDto,
      countryCode: 'IN',
      roleCatalogId: 'role-1',
    } as any);

    expect(prisma.roleCatalog.findUnique).toHaveBeenCalledWith({
      where: { id: 'role-1' },
    });
  });

  it('throws when roleCatalogId is invalid', async () => {
    prisma.roleCatalog.findUnique.mockResolvedValue(null);

    await expect(
      service.create({ ...baseDto, roleCatalogId: 'missing' } as any),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('WorkExperienceService totalExperience sync', () => {
  const prisma = {
    candidate: { findUnique: jest.fn(), update: jest.fn() },
    roleCatalog: { findUnique: jest.fn() },
    country: { findUnique: jest.fn() },
    $transaction: jest.fn(),
    workExperience: {
      updateMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  let service: WorkExperienceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkExperienceService(prisma as any);
    prisma.candidate.findUnique.mockResolvedValue({ id: 'cand-1' });
    prisma.candidate.update.mockResolvedValue({ id: 'cand-1' });
    prisma.workExperience.updateMany.mockResolvedValue({ count: 0 });
  });

  const baseDto = {
    candidateId: 'cand-1',
    jobTitle: 'Nurse',
    startDate: '2020-01-01T00:00:00.000Z',
    endDate: '2022-01-01T00:00:00.000Z',
  };

  it('syncs candidate totalExperience to 0 after remove when no work history remains', async () => {
    prisma.workExperience.findUnique.mockResolvedValue({
      id: 'we-1',
      candidateId: 'cand-1',
    });

    const txCandidateUpdate = jest.fn().mockResolvedValue({ id: 'cand-1' });
    const txWorkDelete = jest
      .fn()
      .mockResolvedValue({ id: 'we-1', candidateId: 'cand-1' });
    const txWorkFindMany = jest.fn().mockResolvedValue([]);

    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        workExperience: {
          delete: txWorkDelete,
          findMany: txWorkFindMany,
        },
        candidate: {
          update: txCandidateUpdate,
        },
      }),
    );

    await service.remove('we-1');

    expect(txWorkDelete).toHaveBeenCalledWith({ where: { id: 'we-1' } });
    expect(txWorkFindMany).toHaveBeenCalledWith({
      where: { candidateId: 'cand-1' },
      orderBy: { startDate: 'asc' },
    });
    expect(txCandidateUpdate).toHaveBeenCalledWith({
      where: { id: 'cand-1' },
      data: { totalExperience: 0, experience: 0 },
    });
  });

  it('syncs candidate totalExperience after create', async () => {
    prisma.workExperience.create.mockResolvedValue({
      id: 'we-1',
      candidateId: 'cand-1',
    });
    prisma.workExperience.findMany.mockResolvedValue([
      {
        startDate: new Date('2020-01-01'),
        endDate: new Date('2022-01-01'),
        isCurrent: false,
      },
    ]);

    await service.create(baseDto as any);

    expect(prisma.workExperience.findMany).toHaveBeenCalledWith({
      where: { candidateId: 'cand-1' },
      orderBy: { startDate: 'asc' },
    });
    expect(prisma.candidate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cand-1' },
        data: expect.objectContaining({
          totalExperience: expect.any(Number),
          experience: expect.any(Number),
        }),
      }),
    );
  });
});
