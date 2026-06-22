import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CandidateCountryRestrictionsService } from '../candidate-country-restrictions.service';
import { PrismaService } from '../../database/prisma.service';
import { COUNTRY_RESTRICTION_TYPES } from '../../common/constants/country-restriction-types';
import {
  assertCandidateNotRestrictedForCountry,
  buildCountryRestrictionBlockMessage,
} from '../utils/country-restriction-guard';

describe('CandidateCountryRestrictionsService', () => {
  let service: CandidateCountryRestrictionsService;
  let prisma: {
    country: { findUnique: jest.Mock };
    candidate: { findUnique: jest.Mock };
    candidateCountryRestriction: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      country: { findUnique: jest.fn() },
      candidate: { findUnique: jest.fn() },
      candidateCountryRestriction: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    service = new CandidateCountryRestrictionsService(
      prisma as unknown as PrismaService,
    );
  });

  it('creates a new active restriction', async () => {
    prisma.country.findUnique.mockResolvedValue({ code: 'SA', name: 'Saudi Arabia' });
    prisma.candidateCountryRestriction.findFirst.mockResolvedValue(null);
    prisma.candidateCountryRestriction.create.mockResolvedValue({
      id: 'restriction-1',
      countryCode: 'SA',
      isActive: true,
    });

    await service.applyRestriction({
      candidateId: 'candidate-1',
      countryCode: 'SA',
      restrictionType: COUNTRY_RESTRICTION_TYPES.PROCESSING_STEP_CANCEL,
      reason: 'Data Flow failed verification',
      sourceMeta: { stepKey: 'data_flow' } as Prisma.InputJsonValue,
      restrictedById: 'user-1',
    });

    expect(prisma.candidateCountryRestriction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          candidateId: 'candidate-1',
          countryCode: 'SA',
          restrictionType: COUNTRY_RESTRICTION_TYPES.PROCESSING_STEP_CANCEL,
        }),
      }),
    );
  });

  it('updates an existing active restriction instead of creating a duplicate', async () => {
    prisma.country.findUnique.mockResolvedValue({ code: 'SA', name: 'Saudi Arabia' });
    prisma.candidateCountryRestriction.findFirst.mockResolvedValue({
      id: 'restriction-1',
      sourceMeta: { stepKey: 'data_flow' },
    });
    prisma.candidateCountryRestriction.update.mockResolvedValue({
      id: 'restriction-1',
      isActive: true,
    });

    await service.applyRestriction({
      candidateId: 'candidate-1',
      countryCode: 'SA',
      restrictionType: COUNTRY_RESTRICTION_TYPES.PROCESSING_STEP_CANCEL,
      reason: 'Updated reason',
      restrictedById: 'user-2',
    });

    expect(prisma.candidateCountryRestriction.update).toHaveBeenCalled();
    expect(prisma.candidateCountryRestriction.create).not.toHaveBeenCalled();
  });

  it('lifts an active restriction', async () => {
    prisma.candidateCountryRestriction.findFirst.mockResolvedValue({
      id: 'restriction-1',
      country: { name: 'Saudi Arabia', code: 'SA' },
    });
    prisma.candidateCountryRestriction.update.mockResolvedValue({
      id: 'restriction-1',
      isActive: false,
    });

    await service.liftRestriction(
      'candidate-1',
      'SA',
      'manager-1',
      'Issue resolved after document correction',
    );

    expect(prisma.candidateCountryRestriction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'restriction-1' },
        data: expect.objectContaining({
          isActive: false,
          liftedById: 'manager-1',
        }),
      }),
    );
  });

  it('throws when lifting a missing restriction', async () => {
    prisma.candidateCountryRestriction.findFirst.mockResolvedValue(null);

    await expect(
      service.liftRestriction(
        'candidate-1',
        'SA',
        'manager-1',
        'Issue resolved after document correction',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('liftRestrictionIfActive returns null when no active restriction exists', async () => {
    prisma.candidateCountryRestriction.findFirst.mockResolvedValue(null);

    await expect(
      service.liftRestrictionIfActive(
        'candidate-1',
        'SA',
        'manager-1',
        'Reactivated processing',
      ),
    ).resolves.toBeNull();

    expect(prisma.candidateCountryRestriction.update).not.toHaveBeenCalled();
  });

  it('liftRestrictionIfActive lifts when an active restriction exists', async () => {
    prisma.candidateCountryRestriction.findFirst.mockResolvedValue({
      id: 'restriction-1',
      country: { name: 'Saudi Arabia', code: 'SA' },
    });
    prisma.candidateCountryRestriction.update.mockResolvedValue({
      id: 'restriction-1',
      isActive: false,
    });

    await service.liftRestrictionIfActive(
      'candidate-1',
      'SA',
      'manager-1',
      'Reactivated processing',
    );

    expect(prisma.candidateCountryRestriction.update).toHaveBeenCalled();
  });

  it('returns paginated restrictions with default limit of 5', async () => {
    prisma.candidate.findUnique.mockResolvedValue({ id: 'candidate-1' });
    prisma.candidateCountryRestriction.count.mockResolvedValue(7);
    prisma.candidateCountryRestriction.findMany.mockResolvedValue([
      { id: 'restriction-1', isActive: true },
      { id: 'restriction-2', isActive: true },
    ]);

    const result = await service.findRestrictions('candidate-1', {
      page: 2,
      limit: 5,
    });

    expect(prisma.candidateCountryRestriction.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          candidateId: 'candidate-1',
          isActive: true,
        }),
      }),
    );
    expect(prisma.candidateCountryRestriction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
      }),
    );
    expect(result).toEqual({
      items: [
        { id: 'restriction-1', isActive: true },
        { id: 'restriction-2', isActive: true },
      ],
      pagination: {
        page: 2,
        limit: 5,
        total: 7,
        totalPages: 2,
      },
    });
  });
});

describe('country-restriction-guard', () => {
  it('builds a Data Flow restriction message', () => {
    const message = buildCountryRestrictionBlockMessage({
      countryCode: 'SA',
      restrictionType: COUNTRY_RESTRICTION_TYPES.PROCESSING_STEP_CANCEL,
      sourceMeta: {
        stepKey: 'data_flow',
        projectTitle: 'Saudi MOH',
      },
      country: { code: 'SA', name: 'Saudi Arabia' },
    } as any);

    expect(message).toContain('Saudi Arabia');
    expect(message).toContain('Data Flow');
    expect(message).toContain('Saudi MOH');
  });

  it('throws when candidate has an active restriction for the project country', async () => {
    const prisma = {
      candidateCountryRestriction: {
        findFirst: jest.fn().mockResolvedValue({
          countryCode: 'SA',
          restrictionType: COUNTRY_RESTRICTION_TYPES.PROCESSING_STEP_CANCEL,
          sourceMeta: { stepKey: 'data_flow', projectTitle: 'Saudi MOH' },
          country: { code: 'SA', name: 'Saudi Arabia' },
        }),
      },
    };

    await expect(
      assertCandidateNotRestrictedForCountry(prisma as any, 'candidate-1', 'SA'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('skips guard when project country is not set', async () => {
    const prisma = {
      candidateCountryRestriction: {
        findFirst: jest.fn(),
      },
    };

    await expect(
      assertCandidateNotRestrictedForCountry(prisma as any, 'candidate-1', null),
    ).resolves.toBeUndefined();
    expect(prisma.candidateCountryRestriction.findFirst).not.toHaveBeenCalled();
  });
});
