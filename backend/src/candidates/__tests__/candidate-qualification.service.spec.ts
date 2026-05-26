import { BadRequestException } from '@nestjs/common';
import { CandidateQualificationService } from '../candidate-qualification.service';

describe('CandidateQualificationService countryCode', () => {
  const prisma = {
    candidate: { findUnique: jest.fn() },
    qualification: { findUnique: jest.fn() },
    country: { findUnique: jest.fn() },
    candidateQualification: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  let service: CandidateQualificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CandidateQualificationService(prisma as any);
    prisma.candidate.findUnique.mockResolvedValue({ id: 'cand-1' });
    prisma.qualification.findUnique.mockResolvedValue({ id: 'qual-1' });
    prisma.candidateQualification.findFirst.mockResolvedValue(null);
  });

  const baseDto = {
    candidateId: 'cand-1',
    qualificationId: 'qual-1',
  };

  it('creates without countryCode when omitted', async () => {
    prisma.candidateQualification.create.mockResolvedValue({ id: 'cq-1' });

    await service.create(baseDto as any);

    expect(prisma.country.findUnique).not.toHaveBeenCalled();
    expect(prisma.candidateQualification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ countryCode: null }),
      }),
    );
  });

  it('creates with valid countryCode', async () => {
    prisma.country.findUnique.mockResolvedValue({ code: 'AE' });
    prisma.candidateQualification.create.mockResolvedValue({ id: 'cq-1' });

    await service.create({ ...baseDto, countryCode: 'AE' } as any);

    expect(prisma.candidateQualification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ countryCode: 'AE' }),
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
    prisma.candidateQualification.findUnique.mockResolvedValue({
      id: 'cq-1',
      candidateId: 'cand-1',
    });
    prisma.candidateQualification.update.mockResolvedValue({ id: 'cq-1' });

    await service.update('cq-1', { countryCode: null } as any);

    expect(prisma.candidateQualification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ countryCode: null }),
      }),
    );
  });
});
