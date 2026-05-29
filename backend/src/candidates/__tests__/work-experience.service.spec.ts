import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkExperienceService } from '../work-experience.service';

describe('WorkExperienceService countryCode', () => {
  const prisma = {
    candidate: { findUnique: jest.fn() },
    roleCatalog: { findUnique: jest.fn() },
    country: { findUnique: jest.fn() },
    workExperience: {
      updateMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  let service: WorkExperienceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkExperienceService(prisma as any);
    prisma.candidate.findUnique.mockResolvedValue({ id: 'cand-1' });
    prisma.workExperience.updateMany.mockResolvedValue({ count: 0 });
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
