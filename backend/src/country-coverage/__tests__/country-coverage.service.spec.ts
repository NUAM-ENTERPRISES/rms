import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ProfessionSector,
  RecruiterCountrySectorScope,
  UserAccountStatus,
} from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { CountryCoverageService } from '../country-coverage.service';
import { CountryCoverageGroup } from '../dto/query-country-coverage.dto';

const NURSE_PROFESSION = {
  id: 'prof-nurse',
  label: 'Nurse',
  sector: ProfessionSector.HEALTHCARE,
};

const DRIVER_PROFESSION = {
  id: 'prof-driver',
  label: 'Driver',
  sector: ProfessionSector.NON_HEALTH_CARE,
};

type TestProfession = typeof NURSE_PROFESSION;

type TestCandidate = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  mobileNumber?: string | null;
  countryCode?: string | null;
  profileImage?: string | null;
  statusName?: string;
  professionTypeId?: string;
  professionLabel?: string;
  sector?: ProfessionSector | null;
};

function professionScopes(...professions: TestProfession[]) {
  return professions.map((p) => ({
    professionType: { id: p.id, label: p.label, sector: p.sector },
  }));
}

function peerFindFirstResult(
  id: string,
  name: string,
  email: string,
  professions: TestProfession[] = [NURSE_PROFESSION],
) {
  return {
    user: {
      id,
      name,
      email,
      userProfessionScopes: professionScopes(...professions),
    },
  };
}

function nurseCandidate(
  id: string,
  overrides: Partial<TestCandidate> = {},
): TestCandidate {
  return {
    id,
    professionTypeId: NURSE_PROFESSION.id,
    professionLabel: NURSE_PROFESSION.label,
    sector: NURSE_PROFESSION.sector,
    ...overrides,
  };
}

function driverCandidate(
  id: string,
  overrides: Partial<TestCandidate> = {},
): TestCandidate {
  return {
    id,
    professionTypeId: DRIVER_PROFESSION.id,
    professionLabel: DRIVER_PROFESSION.label,
    sector: DRIVER_PROFESSION.sector,
    ...overrides,
  };
}

function setupCandidateFindMany(
  candidateFindMany: jest.Mock,
  candidates: TestCandidate[],
) {
  candidateFindMany.mockImplementation(
    (args?: {
      select?: Record<string, unknown>;
      skip?: number;
      take?: number;
    }) => {
      const select = args?.select ?? {};

      if (Object.keys(select).length === 1 && select.id === true) {
        return Promise.resolve(candidates.map((c) => ({ id: c.id })));
      }

      if (
        select.professionTypeId === true &&
        select.professionType &&
        !select.firstName
      ) {
        return Promise.resolve(
          candidates.map((c) => ({
            id: c.id,
            professionTypeId: c.professionTypeId ?? NURSE_PROFESSION.id,
            professionType: {
              label: c.professionLabel ?? NURSE_PROFESSION.label,
              sector: c.sector ?? NURSE_PROFESSION.sector,
            },
          })),
        );
      }

      if (
        select.firstName === true &&
        select.professionTypeId === true &&
        select.professionType &&
        !select.email
      ) {
        return Promise.resolve(
          candidates.map((c) => ({
            id: c.id,
            firstName: c.firstName ?? 'First',
            lastName: c.lastName ?? 'Last',
            professionTypeId: c.professionTypeId ?? NURSE_PROFESSION.id,
            professionType: {
              label: c.professionLabel ?? NURSE_PROFESSION.label,
            },
          })),
        );
      }

      if (
        select.firstName === true &&
        select.currentStatus &&
        !select.professionTypeId
      ) {
        return Promise.resolve(
          candidates.map((c) => ({
            id: c.id,
            firstName: c.firstName ?? 'First',
            lastName: c.lastName ?? 'Last',
            currentStatus: { statusName: c.statusName ?? 'Interested' },
          })),
        );
      }

      if (select.email !== undefined) {
        const skip = args?.skip ?? 0;
        const take = args?.take ?? candidates.length;
        const page = candidates.slice(skip, skip + take);
        return Promise.resolve(
          page.map((c) => ({
            id: c.id,
            firstName: c.firstName ?? 'First',
            lastName: c.lastName ?? 'Last',
            email: c.email ?? null,
            mobileNumber: c.mobileNumber ?? null,
            countryCode: c.countryCode ?? null,
            profileImage: c.profileImage ?? null,
            professionTypeId: c.professionTypeId ?? NURSE_PROFESSION.id,
            currentStatus: { statusName: c.statusName ?? 'Interested' },
            professionType: {
              label: c.professionLabel ?? NURSE_PROFESSION.label,
              sector: c.sector ?? NURSE_PROFESSION.sector,
            },
          })),
        );
      }

      return Promise.resolve(candidates.map((c) => ({ id: c.id })));
    },
  );
}

describe('CountryCoverageService', () => {
  let service: CountryCoverageService;
  let prisma: {
    userCountryCoverage: {
      findMany: jest.Mock;
      count: jest.Mock;
      deleteMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    country: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
    candidate: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
    candidateRecruiterAssignment: {
      updateMany: jest.Mock;
      create: jest.Mock;
    };
    countryCoverageTransfer: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
    };
    countryCoverageTransferCandidate: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let outboxService: {
    publishRecruiterCountryCoverageTransferred: jest.Mock;
  };
  let auditService: {
    logUserAction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      userCountryCoverage: {
        findMany: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      country: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      candidate: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      candidateRecruiterAssignment: {
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      countryCoverageTransfer: {
        create: jest.fn().mockResolvedValue({ id: 'hist1' }),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
      },
      countryCoverageTransferCandidate: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(async (fn: (tx: typeof prisma) => Promise<unknown>) =>
        fn(prisma),
      ),
    };
    outboxService = {
      publishRecruiterCountryCoverageTransferred: jest.fn(),
    };
    auditService = {
      logUserAction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CountryCoverageService,
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxService, useValue: outboxService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get(CountryCoverageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCountrySummaries', () => {
    it('aggregates user counts and unique GCC users without duplicates', async () => {
      prisma.userCountryCoverage.findMany
        .mockResolvedValueOnce([
          {
            userId: 'u1',
            countryCode: 'KW',
            sectorScopes: [RecruiterCountrySectorScope.HEALTHCARE],
            country: { code: 'KW', name: 'Kuwait' },
          },
          {
            userId: 'u1',
            countryCode: 'OM',
            sectorScopes: [RecruiterCountrySectorScope.HEALTHCARE],
            country: { code: 'OM', name: 'Oman' },
          },
          {
            userId: 'u2',
            countryCode: 'IN',
            sectorScopes: [RecruiterCountrySectorScope.NON_HEALTH_CARE],
            country: { code: 'IN', name: 'India' },
          },
        ])
        .mockResolvedValueOnce([
          {
            userId: 'u1',
            countryCode: 'KW',
            sectorScopes: [RecruiterCountrySectorScope.HEALTHCARE],
          },
          {
            userId: 'u1',
            countryCode: 'OM',
            sectorScopes: [RecruiterCountrySectorScope.HEALTHCARE],
          },
        ]);

      const result = await service.getCountrySummaries({});

      expect(result.data.gcc.userCount).toBe(1);
      expect(result.data.gcc.healthcareCount).toBe(1);
      expect(result.data.countries).toEqual([
        expect.objectContaining({ code: 'IN', userCount: 1, isGcc: false }),
      ]);
      expect(result.data.pagination).toEqual({
        page: 1,
        limit: 15,
        total: 1,
        totalPages: 1,
      });
    });

    it('filters by group GCC', async () => {
      prisma.userCountryCoverage.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.getCountrySummaries({ group: CountryCoverageGroup.GCC });

      expect(prisma.userCountryCoverage.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: expect.objectContaining({
            countryCode: { in: expect.arrayContaining(['SA', 'AE']) },
          }),
        }),
      );
    });
  });

  describe('getUsersByCountry', () => {
    it('returns paginated users for a country', async () => {
      prisma.country.findUnique.mockResolvedValue({
        code: 'SA',
        name: 'Saudi Arabia',
      });
      prisma.userCountryCoverage.count.mockResolvedValue(1);
      prisma.userCountryCoverage.findMany
        .mockResolvedValueOnce([
          {
            sectorScopes: [RecruiterCountrySectorScope.HEALTHCARE],
            countryCode: 'SA',
            user: {
              id: 'u1',
              name: 'Jane Recruiter',
              email: 'jane@example.com',
              profileImage: null,
              mobileNumber: '9876543210',
              countryCode: '+91',
              accountStatus: UserAccountStatus.ACTIVE,
              userRoles: [{ role: { id: 'r1', name: 'Recruiter' } }],
            },
          },
        ])
        .mockResolvedValueOnce([
          { sectorScopes: [RecruiterCountrySectorScope.HEALTHCARE] },
        ]);

      const result = await service.getUsersByCountry('sa', {
        page: 1,
        limit: 10,
      });

      expect(result.data.country).toEqual({
        code: 'SA',
        name: 'Saudi Arabia',
      });
      expect(result.data.users[0].id).toBe('u1');
    });

    it('deduplicates users for GCC group', async () => {
      prisma.userCountryCoverage.findMany.mockResolvedValue([
        {
          countryCode: 'KW',
          sectorScopes: [RecruiterCountrySectorScope.HEALTHCARE],
          user: {
            id: 'u1',
            name: 'Jane Recruiter',
            email: 'jane@example.com',
            profileImage: null,
            mobileNumber: '111',
            countryCode: '+965',
            accountStatus: UserAccountStatus.ACTIVE,
            userRoles: [{ role: { id: 'r1', name: 'Recruiter' } }],
          },
        },
        {
          countryCode: 'OM',
          sectorScopes: [RecruiterCountrySectorScope.NON_HEALTH_CARE],
          user: {
            id: 'u1',
            name: 'Jane Recruiter',
            email: 'jane@example.com',
            profileImage: null,
            mobileNumber: '111',
            countryCode: '+965',
            accountStatus: UserAccountStatus.ACTIVE,
            userRoles: [{ role: { id: 'r1', name: 'Recruiter' } }],
          },
        },
      ]);
      prisma.country.findMany.mockResolvedValue([
        { code: 'SA', name: 'Saudi Arabia' },
        { code: 'AE', name: 'United Arab Emirates' },
        { code: 'QA', name: 'Qatar' },
        { code: 'OM', name: 'Oman' },
        { code: 'BH', name: 'Bahrain' },
        { code: 'KW', name: 'Kuwait' },
      ]);

      const result = await service.getUsersByCountry('GCC', {
        page: 1,
        limit: 10,
      });

      expect(result.data.country).toEqual({ code: 'GCC', name: 'GCC' });
      expect(result.data.users).toHaveLength(1);
      expect(result.data.users[0].coveredCountryCodes).toEqual(['KW', 'OM']);
      expect(result.data.uniqueUserCount).toBe(1);
    });

    it('throws when country is missing', async () => {
      prisma.country.findUnique.mockResolvedValue(null);

      await expect(service.getUsersByCountry('ZZ', {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getTransferPreview', () => {
    it('returns paginated positive candidates without peer recruiters', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'emma',
        name: 'Emma',
        email: 'emma@example.com',
        accountStatus: UserAccountStatus.ACTIVE,
        userCountryCoverages: [{ countryCode: 'SA' }],
      });
      prisma.candidate.count.mockResolvedValue(1);
      setupCandidateFindMany(prisma.candidate.findMany, [
        nurseCandidate('c1', {
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
          mobileNumber: '9876543210',
          countryCode: '+91',
          profileImage: null,
          statusName: 'Interested',
        }),
      ]);
      prisma.userCountryCoverage.findMany.mockResolvedValueOnce([
        {
          countryCode: 'SA',
          sectorScopes: [RecruiterCountrySectorScope.HEALTHCARE],
          country: { name: 'Saudi Arabia' },
        },
      ]);

      const result = await service.getTransferPreview('SA', 'emma', {
        page: 1,
        limit: 10,
      });

      expect(result.data.positiveCandidates).toEqual([
        {
          id: 'c1',
          firstName: 'Ada',
          lastName: 'Lovelace',
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          mobileNumber: '9876543210',
          phoneCountryCode: '+91',
          profileImage: null,
          statusName: 'Interested',
          professionTypeId: NURSE_PROFESSION.id,
          professionLabel: NURSE_PROFESSION.label,
          sector: NURSE_PROFESSION.sector,
        },
      ]);
      expect(result.data.positiveCandidateProfessions).toEqual([
        {
          id: 'c1',
          professionTypeId: NURSE_PROFESSION.id,
          professionLabel: NURSE_PROFESSION.label,
          sector: NURSE_PROFESSION.sector,
        },
      ]);
      expect(result.data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
      expect(result.data).not.toHaveProperty('allPositiveCandidateIds');
      expect(result.data).not.toHaveProperty('peerRecruiters');
      expect(result.data.requiresCandidateHandoff).toBe(true);
      expect(result.data.sourceCountryCodes).toEqual(['SA']);
      expect(prisma.candidate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('applies skip/take for page 2', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'emma',
        name: 'Emma',
        email: 'emma@example.com',
        accountStatus: UserAccountStatus.ACTIVE,
        userCountryCoverages: [{ countryCode: 'SA' }],
      });
      prisma.candidate.count.mockResolvedValue(12);
      setupCandidateFindMany(
        prisma.candidate.findMany,
        Array.from({ length: 12 }, (_, i) =>
          nurseCandidate(`c${i + 1}`, {
            firstName: `First${i + 1}`,
            lastName: `Last${i + 1}`,
            email: null,
            mobileNumber: null,
            countryCode: null,
            profileImage: null,
            statusName: 'Interested',
          }),
        ),
      );
      prisma.userCountryCoverage.findMany.mockResolvedValueOnce([]);

      const result = await service.getTransferPreview('SA', 'emma', {
        page: 2,
        limit: 10,
      });

      expect(result.data.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 12,
        totalPages: 2,
      });
      expect(result.data.positiveCandidates).toHaveLength(2);
      expect(result.data.positiveCandidates[0].id).toBe('c11');
      expect(result.data.positiveCandidates[1].id).toBe('c12');
      expect(result.data).not.toHaveProperty('allPositiveCandidateIds');
      expect(prisma.candidate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('uses all GCC codes when source is GCC', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'emma',
        name: 'Emma',
        email: 'emma@example.com',
        accountStatus: UserAccountStatus.ACTIVE,
        userCountryCoverages: [{ countryCode: 'KW' }],
      });
      prisma.candidate.count.mockResolvedValue(0);
      prisma.candidate.findMany.mockResolvedValue([]);
      prisma.userCountryCoverage.findMany.mockResolvedValueOnce([
        {
          countryCode: 'KW',
          sectorScopes: [RecruiterCountrySectorScope.HEALTHCARE],
          country: { name: 'Kuwait' },
        },
      ]);

      const result = await service.getTransferPreview('GCC', 'emma');

      expect(result.data.sourceCountryCodes).toEqual(
        expect.arrayContaining(['SA', 'AE', 'KW']),
      );
      expect(result.data.requiresCandidateHandoff).toBe(false);
      expect(result.data.pagination.total).toBe(0);
    });

    it('returns profession fields and positiveCandidateProfessions', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'emma',
        name: 'Emma',
        email: 'emma@example.com',
        accountStatus: UserAccountStatus.ACTIVE,
        userCountryCoverages: [{ countryCode: 'SA' }],
      });
      prisma.candidate.count.mockResolvedValue(2);
      setupCandidateFindMany(prisma.candidate.findMany, [
        nurseCandidate('c1', {
          firstName: 'Nora',
          lastName: 'Nurse',
          statusName: 'Interested',
        }),
        driverCandidate('c2', {
          firstName: 'Dan',
          lastName: 'Driver',
          statusName: 'Future',
        }),
      ]);
      prisma.userCountryCoverage.findMany.mockResolvedValueOnce([]);

      const result = await service.getTransferPreview('SA', 'emma');

      expect(result.data.positiveCandidates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'c1',
            professionTypeId: NURSE_PROFESSION.id,
            professionLabel: NURSE_PROFESSION.label,
            sector: NURSE_PROFESSION.sector,
          }),
          expect.objectContaining({
            id: 'c2',
            professionTypeId: DRIVER_PROFESSION.id,
            professionLabel: DRIVER_PROFESSION.label,
            sector: DRIVER_PROFESSION.sector,
          }),
        ]),
      );
      expect(result.data.positiveCandidateProfessions).toEqual([
        {
          id: 'c1',
          professionTypeId: NURSE_PROFESSION.id,
          professionLabel: NURSE_PROFESSION.label,
          sector: NURSE_PROFESSION.sector,
        },
        {
          id: 'c2',
          professionTypeId: DRIVER_PROFESSION.id,
          professionLabel: DRIVER_PROFESSION.label,
          sector: DRIVER_PROFESSION.sector,
        },
      ]);
    });
  });

  describe('getTransferPeers', () => {
    it('returns paginated peer recruiters', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'emma',
        name: 'Emma',
        email: 'emma@example.com',
        accountStatus: UserAccountStatus.ACTIVE,
        userCountryCoverages: [{ countryCode: 'SA' }],
      });
      prisma.userCountryCoverage.findMany.mockResolvedValue([
        {
          countryCode: 'SA',
          user: {
            id: 'peer1',
            name: 'Alpha Peer',
            email: 'a@example.com',
            mobileNumber: '9876543210',
            countryCode: '+91',
            profileImage: 'https://cdn.example/a.jpg',
            userProfessionScopes: professionScopes(NURSE_PROFESSION),
          },
        },
        {
          countryCode: 'SA',
          user: {
            id: 'peer2',
            name: 'Beta Peer',
            email: 'b@example.com',
            mobileNumber: '9123456780',
            countryCode: '+971',
            profileImage: null,
            userProfessionScopes: professionScopes(
              NURSE_PROFESSION,
              DRIVER_PROFESSION,
            ),
          },
        },
        {
          countryCode: 'SA',
          user: {
            id: 'peer3',
            name: 'Gamma Peer',
            email: 'c@example.com',
            mobileNumber: '9000000000',
            countryCode: '+91',
            profileImage: null,
            userProfessionScopes: professionScopes(DRIVER_PROFESSION),
          },
        },
      ]);
      prisma.candidate.count
        .mockResolvedValueOnce(12)
        .mockResolvedValueOnce(3);

      const result = await service.getTransferPeers('SA', 'emma', {
        page: 1,
        limit: 2,
      });

      expect(result.data.peers).toHaveLength(2);
      expect(result.data.peers[0]).toEqual({
        id: 'peer1',
        name: 'Alpha Peer',
        email: 'a@example.com',
        mobileNumber: '9876543210',
        phoneCountryCode: '+91',
        profileImage: 'https://cdn.example/a.jpg',
        positiveCandidateCount: 12,
        coveredCountryCodes: ['SA'],
        professionScopes: [
          {
            id: NURSE_PROFESSION.id,
            label: NURSE_PROFESSION.label,
            sector: NURSE_PROFESSION.sector,
          },
        ],
        sectorScopes: [ProfessionSector.HEALTHCARE],
      });
      expect(result.data.peers[1]).toEqual({
        id: 'peer2',
        name: 'Beta Peer',
        email: 'b@example.com',
        mobileNumber: '9123456780',
        phoneCountryCode: '+971',
        profileImage: null,
        positiveCandidateCount: 3,
        coveredCountryCodes: ['SA'],
        professionScopes: [
          {
            id: NURSE_PROFESSION.id,
            label: NURSE_PROFESSION.label,
            sector: NURSE_PROFESSION.sector,
          },
          {
            id: DRIVER_PROFESSION.id,
            label: DRIVER_PROFESSION.label,
            sector: DRIVER_PROFESSION.sector,
          },
        ],
        sectorScopes: [
          ProfessionSector.HEALTHCARE,
          ProfessionSector.NON_HEALTH_CARE,
        ],
      });
      expect(result.data.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
      expect(prisma.candidate.count).toHaveBeenCalledTimes(2);
    });

    it('returns professionScopes and sectorScopes on peers', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'emma',
        name: 'Emma',
        email: 'emma@example.com',
        accountStatus: UserAccountStatus.ACTIVE,
        userCountryCoverages: [{ countryCode: 'SA' }],
      });
      prisma.userCountryCoverage.findMany.mockResolvedValue([
        {
          countryCode: 'SA',
          user: {
            id: 'peer1',
            name: 'Scoped Peer',
            email: 'scoped@example.com',
            mobileNumber: '9111111111',
            countryCode: '+91',
            profileImage: null,
            userProfessionScopes: professionScopes(DRIVER_PROFESSION),
          },
        },
      ]);
      prisma.candidate.count.mockResolvedValue(0);

      const result = await service.getTransferPeers('SA', 'emma', {
        page: 1,
        limit: 10,
      });

      expect(result.data.peers[0].professionScopes).toEqual([
        {
          id: DRIVER_PROFESSION.id,
          label: DRIVER_PROFESSION.label,
          sector: DRIVER_PROFESSION.sector,
        },
      ]);
      expect(result.data.peers[0].sectorScopes).toEqual([
        ProfessionSector.NON_HEALTH_CARE,
      ]);
    });

    it('filters peers by search', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'emma',
        name: 'Emma',
        email: 'emma@example.com',
        accountStatus: UserAccountStatus.ACTIVE,
        userCountryCoverages: [{ countryCode: 'SA' }],
      });
      prisma.userCountryCoverage.findMany.mockResolvedValue([
        {
          countryCode: 'SA',
          user: {
            id: 'peer1',
            name: 'Jane Doe',
            email: 'jane@example.com',
            mobileNumber: '9111111111',
            countryCode: '+91',
            profileImage: null,
          },
        },
      ]);
      prisma.candidate.count.mockResolvedValue(0);

      await service.getTransferPeers('SA', 'emma', {
        page: 1,
        limit: 10,
        search: 'jane',
      });

      expect(prisma.userCountryCoverage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: expect.objectContaining({
              OR: [
                { name: { contains: 'jane', mode: 'insensitive' } },
                { email: { contains: 'jane', mode: 'insensitive' } },
              ],
            }),
          }),
        }),
      );
    });
  });

  describe('transferCountryCoverage', () => {
    const baseSourceUser = {
      id: 'emma',
      name: 'Emma',
      email: 'emma@example.com',
      accountStatus: UserAccountStatus.ACTIVE,
      userCountryCoverages: [{ countryCode: 'SA' }],
    };

    it('rejects destination inside the source set', async () => {
      prisma.user.findUnique.mockResolvedValue(baseSourceUser);

      await expect(
        service.transferCountryCoverage(
          'SA',
          'emma',
          {
            destinationCountryCode: 'SA',
            reason: 'Invalid destination',
          },
          'manager1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('requires all positive candidates when handoff is needed', async () => {
      prisma.user.findUnique.mockResolvedValue(baseSourceUser);
      prisma.country.findFirst.mockResolvedValue({
        code: 'IE',
        name: 'Ireland',
      });
      setupCandidateFindMany(prisma.candidate.findMany, [
        nurseCandidate('c1'),
        nurseCandidate('c2'),
      ]);
      prisma.userCountryCoverage.findFirst.mockResolvedValue(
        peerFindFirstResult('peer1', 'Peer', 'peer@example.com'),
      );

      await expect(
        service.transferCountryCoverage(
          'SA',
          'emma',
          {
            destinationCountryCode: 'IE',
            assignments: [
              { targetRecruiterId: 'peer1', candidateIds: ['c1'] },
            ],
            reason: 'Incomplete handoff',
          },
          'manager1',
        ),
      ).rejects.toThrow(/All positive candidates must be assigned/);
    });

    it('moves coverage with zero positive candidates', async () => {
      prisma.user.findUnique.mockResolvedValue(baseSourceUser);
      prisma.country.findFirst.mockResolvedValue({
        code: 'IE',
        name: 'Ireland',
      });
      prisma.candidate.findMany.mockResolvedValue([]);
      prisma.userCountryCoverage.findMany.mockResolvedValue([
        {
          countryCode: 'SA',
          sectorScopes: [RecruiterCountrySectorScope.HEALTHCARE],
          country: { name: 'Saudi Arabia' },
        },
      ]);
      prisma.userCountryCoverage.findUnique.mockResolvedValue(null);
      prisma.userCountryCoverage.deleteMany.mockResolvedValue({ count: 1 });
      prisma.userCountryCoverage.create.mockResolvedValue({});
      prisma.countryCoverageTransfer.create.mockResolvedValue({ id: 'hist1' });

      const result = await service.transferCountryCoverage(
        'SA',
        'emma',
        {
          destinationCountryCode: 'IE',
          reason: 'No positives; move coverage',
        },
        'manager1',
      );

      expect(result.data.destinationCountryCode).toBe('IE');
      expect(result.data.transferredCandidateCount).toBe(0);
      expect(result.data.assignments).toEqual([]);
      expect(prisma.countryCoverageTransfer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            transferMode: 'coverage_only',
            candidateCount: 0,
            sourceUserId: 'emma',
            destinationCountryCode: 'IE',
          }),
        }),
      );
    });

    it('hands off all positives via even split then removes GCC coverages', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...baseSourceUser,
        userCountryCoverages: [{ countryCode: 'KW' }, { countryCode: 'OM' }],
      });
      prisma.country.findFirst.mockResolvedValue({
        code: 'IE',
        name: 'Ireland',
      });
      setupCandidateFindMany(prisma.candidate.findMany, [nurseCandidate('c1')]);
      prisma.userCountryCoverage.findFirst.mockResolvedValue(
        peerFindFirstResult('peer1', 'Peer', 'peer@example.com'),
      );
      prisma.userCountryCoverage.findMany.mockResolvedValueOnce([
        {
          countryCode: 'KW',
          sectorScopes: [RecruiterCountrySectorScope.HEALTHCARE],
          country: { name: 'Kuwait' },
        },
        {
          countryCode: 'OM',
          sectorScopes: [RecruiterCountrySectorScope.NON_HEALTH_CARE],
          country: { name: 'Oman' },
        },
      ]);
      prisma.userCountryCoverage.findUnique.mockResolvedValue(null);
      prisma.candidateRecruiterAssignment.updateMany.mockResolvedValue({
        count: 1,
      });
      prisma.candidateRecruiterAssignment.create.mockResolvedValue({});
      prisma.userCountryCoverage.deleteMany.mockResolvedValue({ count: 2 });
      prisma.userCountryCoverage.create.mockResolvedValue({});

      const result = await service.transferCountryCoverage(
        'GCC',
        'emma',
        {
          destinationCountryCode: 'IE',
          evenSplitAcrossRecruiterIds: ['peer1'],
          reason: 'Move to Ireland',
        },
        'manager1',
      );

      expect(result.data.transferredCandidateCount).toBe(1);
      expect(result.data.assignments).toEqual([
        {
          targetRecruiterId: 'peer1',
          targetRecruiterName: 'Peer',
          transferredCandidateCount: 1,
        },
      ]);
      expect(
        prisma.candidateRecruiterAssignment.updateMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { candidateId: 'c1', isActive: true },
        }),
      );
    });

    it('splits positives evenly across multiple peers', async () => {
      prisma.user.findUnique.mockResolvedValue(baseSourceUser);
      prisma.country.findFirst.mockResolvedValue({
        code: 'IE',
        name: 'Ireland',
      });
      setupCandidateFindMany(
        prisma.candidate.findMany,
        Array.from({ length: 10 }, (_, i) => nurseCandidate(`c${i + 1}`)),
      );
      prisma.userCountryCoverage.findFirst
        .mockResolvedValueOnce(
          peerFindFirstResult('aysa', 'Aysa', 'a@example.com'),
        )
        .mockResolvedValueOnce(
          peerFindFirstResult('john', 'John', 'j@example.com'),
        );
      prisma.userCountryCoverage.findMany.mockResolvedValue([
        {
          countryCode: 'SA',
          sectorScopes: [RecruiterCountrySectorScope.HEALTHCARE],
          country: { name: 'Saudi Arabia' },
        },
      ]);
      prisma.userCountryCoverage.findUnique.mockResolvedValue(null);
      prisma.candidateRecruiterAssignment.updateMany.mockResolvedValue({
        count: 1,
      });
      prisma.candidateRecruiterAssignment.create.mockResolvedValue({});
      prisma.userCountryCoverage.deleteMany.mockResolvedValue({ count: 1 });
      prisma.userCountryCoverage.create.mockResolvedValue({});

      const result = await service.transferCountryCoverage(
        'SA',
        'emma',
        {
          destinationCountryCode: 'IE',
          evenSplitAcrossRecruiterIds: ['john', 'aysa'],
          reason: 'Even split between peers',
        },
        'manager1',
      );

      // Sorted by id: aysa then john → 5 each
      expect(result.data.assignments).toEqual([
        {
          targetRecruiterId: 'aysa',
          targetRecruiterName: 'Aysa',
          transferredCandidateCount: 5,
        },
        {
          targetRecruiterId: 'john',
          targetRecruiterName: 'John',
          transferredCandidateCount: 5,
        },
      ]);
      expect(result.data.transferredCandidateCount).toBe(10);
      expect(prisma.candidateRecruiterAssignment.create).toHaveBeenCalledTimes(
        10,
      );
      expect(
        outboxService.publishRecruiterCountryCoverageTransferred,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          targets: expect.arrayContaining([
            expect.objectContaining({
              targetRecruiterId: 'aysa',
              candidateCount: 5,
            }),
            expect.objectContaining({
              targetRecruiterId: 'john',
              candidateCount: 5,
            }),
          ]),
        }),
      );
    });

    it('accepts manual multi-peer assignments covering the full set', async () => {
      prisma.user.findUnique.mockResolvedValue(baseSourceUser);
      prisma.country.findFirst.mockResolvedValue({
        code: 'IE',
        name: 'Ireland',
      });
      setupCandidateFindMany(prisma.candidate.findMany, [
        nurseCandidate('c1'),
        nurseCandidate('c2'),
      ]);
      prisma.userCountryCoverage.findFirst
        .mockResolvedValueOnce(
          peerFindFirstResult('john', 'John', 'j@example.com'),
        )
        .mockResolvedValueOnce(
          peerFindFirstResult('aysa', 'Aysa', 'a@example.com'),
        );
      prisma.userCountryCoverage.findMany.mockResolvedValue([
        {
          countryCode: 'SA',
          sectorScopes: [RecruiterCountrySectorScope.HEALTHCARE],
          country: { name: 'Saudi Arabia' },
        },
      ]);
      prisma.userCountryCoverage.findUnique.mockResolvedValue(null);
      prisma.candidateRecruiterAssignment.updateMany.mockResolvedValue({
        count: 1,
      });
      prisma.candidateRecruiterAssignment.create.mockResolvedValue({});
      prisma.userCountryCoverage.deleteMany.mockResolvedValue({ count: 1 });
      prisma.userCountryCoverage.create.mockResolvedValue({});

      const result = await service.transferCountryCoverage(
        'SA',
        'emma',
        {
          destinationCountryCode: 'IE',
          assignments: [
            { targetRecruiterId: 'john', candidateIds: ['c1'] },
            { targetRecruiterId: 'aysa', candidateIds: ['c2'] },
          ],
          reason: 'Manual split',
        },
        'manager1',
      );

      expect(result.data.transferredCandidateCount).toBe(2);
      expect(result.data.assignments).toHaveLength(2);
      expect(prisma.candidateRecruiterAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            candidateId: 'c1',
            recruiterId: 'john',
          }),
        }),
      );
      expect(prisma.candidateRecruiterAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            candidateId: 'c2',
            recruiterId: 'aysa',
          }),
        }),
      );
    });

    it('transfers coverage to all GCC countries when destination is GCC', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'emma',
        name: 'Emma',
        email: 'emma@example.com',
        accountStatus: UserAccountStatus.ACTIVE,
        userCountryCoverages: [{ countryCode: 'IE' }],
      });
      prisma.country.findMany.mockResolvedValue(
        ['SA', 'AE', 'QA', 'OM', 'BH', 'KW'].map((code) => ({ code })),
      );
      prisma.candidate.findMany.mockResolvedValue([]);
      prisma.userCountryCoverage.findMany.mockResolvedValue([
        {
          countryCode: 'IE',
          sectorScopes: [RecruiterCountrySectorScope.HEALTHCARE],
          country: { name: 'Ireland' },
        },
      ]);
      prisma.userCountryCoverage.findUnique.mockResolvedValue(null);
      prisma.userCountryCoverage.deleteMany.mockResolvedValue({ count: 1 });
      prisma.userCountryCoverage.create.mockResolvedValue({});

      const result = await service.transferCountryCoverage(
        'IE',
        'emma',
        {
          destinationCountryCode: 'GCC',
          reason: 'Move to GCC',
        },
        'manager1',
      );

      expect(result.data.destinationCountryCode).toBe('GCC');
      expect(result.data.destinationCountryName).toBe('GCC');
      expect(prisma.userCountryCoverage.create).toHaveBeenCalledTimes(6);
      expect(prisma.userCountryCoverage.create).toHaveBeenCalledWith({
        data: {
          userId: 'emma',
          countryCode: 'SA',
          sectorScopes: [RecruiterCountrySectorScope.HEALTHCARE],
        },
      });
    });

    it('rejects GCC destination when source overlaps a GCC country', async () => {
      prisma.user.findUnique.mockResolvedValue(baseSourceUser);

      await expect(
        service.transferCountryCoverage(
          'SA',
          'emma',
          {
            destinationCountryCode: 'GCC',
            reason: 'Overlap',
          },
          'manager1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects peer who does not cover the source context', async () => {
      prisma.user.findUnique.mockResolvedValue(baseSourceUser);
      prisma.country.findFirst.mockResolvedValue({
        code: 'IE',
        name: 'Ireland',
      });
      setupCandidateFindMany(prisma.candidate.findMany, [nurseCandidate('c1')]);
      prisma.userCountryCoverage.findFirst.mockResolvedValue(null);

      await expect(
        service.transferCountryCoverage(
          'SA',
          'emma',
          {
            destinationCountryCode: 'IE',
            evenSplitAcrossRecruiterIds: ['outsider'],
            reason: 'Invalid peer',
          },
          'manager1',
        ),
      ).rejects.toThrow(/same source country/);
    });

    it('persists candidate history rows for multi-peer handoff', async () => {
      prisma.user.findUnique.mockResolvedValue(baseSourceUser);
      prisma.country.findFirst.mockResolvedValue({
        code: 'IE',
        name: 'Ireland',
      });
      setupCandidateFindMany(prisma.candidate.findMany, [
        nurseCandidate('c1', {
          firstName: 'Abhi',
          lastName: 'Kumar',
          statusName: 'Interested',
        }),
        nurseCandidate('c2', {
          firstName: 'Grace',
          lastName: 'Hopper',
          statusName: 'Future',
        }),
      ]);
      prisma.userCountryCoverage.findFirst
        .mockResolvedValueOnce(
          peerFindFirstResult('john', 'John', 'j@example.com'),
        )
        .mockResolvedValueOnce(
          peerFindFirstResult('aysa', 'Aysa', 'a@example.com'),
        );
      prisma.userCountryCoverage.findMany.mockResolvedValue([
        {
          countryCode: 'SA',
          sectorScopes: [RecruiterCountrySectorScope.HEALTHCARE],
          country: { name: 'Saudi Arabia' },
        },
      ]);
      prisma.userCountryCoverage.findUnique.mockResolvedValue(null);
      prisma.candidateRecruiterAssignment.updateMany.mockResolvedValue({
        count: 1,
      });
      prisma.candidateRecruiterAssignment.create.mockResolvedValue({});
      prisma.userCountryCoverage.deleteMany.mockResolvedValue({ count: 1 });
      prisma.userCountryCoverage.create.mockResolvedValue({});

      await service.transferCountryCoverage(
        'SA',
        'emma',
        {
          destinationCountryCode: 'IE',
          assignments: [
            { targetRecruiterId: 'john', candidateIds: ['c1'] },
            { targetRecruiterId: 'aysa', candidateIds: ['c2'] },
          ],
          reason: 'Split handoff',
        },
        'manager1',
      );

      expect(prisma.countryCoverageTransfer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            transferMode: 'manual',
            candidateCount: 2,
            candidates: {
              create: expect.arrayContaining([
                expect.objectContaining({
                  candidateId: 'c1',
                  candidateNameSnapshot: 'Abhi Kumar',
                  fromRecruiterId: 'emma',
                  toRecruiterId: 'john',
                  toRecruiterNameSnapshot: 'John',
                  statusNameSnapshot: 'Interested',
                }),
                expect.objectContaining({
                  candidateId: 'c2',
                  candidateNameSnapshot: 'Grace Hopper',
                  toRecruiterId: 'aysa',
                }),
              ]),
            },
          }),
        }),
      );
    });

    it('auto-splits nurses to Emma and drivers to John when both peers are selected', async () => {
      prisma.user.findUnique.mockResolvedValue(baseSourceUser);
      prisma.country.findFirst.mockResolvedValue({
        code: 'IE',
        name: 'Ireland',
      });
      setupCandidateFindMany(prisma.candidate.findMany, [
        nurseCandidate('n1', { firstName: 'Nora', lastName: 'One' }),
        nurseCandidate('n2', { firstName: 'Nora', lastName: 'Two' }),
        driverCandidate('d1', { firstName: 'Dan', lastName: 'One' }),
        driverCandidate('d2', { firstName: 'Dan', lastName: 'Two' }),
        driverCandidate('d3', { firstName: 'Dan', lastName: 'Three' }),
      ]);
      prisma.userCountryCoverage.findFirst
        .mockResolvedValueOnce(
          peerFindFirstResult(
            'emma-peer',
            'Emma',
            'emma-peer@example.com',
            [NURSE_PROFESSION],
          ),
        )
        .mockResolvedValueOnce(
          peerFindFirstResult(
            'john-peer',
            'John',
            'john-peer@example.com',
            [DRIVER_PROFESSION],
          ),
        );
      prisma.userCountryCoverage.findMany.mockResolvedValue([
        {
          countryCode: 'SA',
          sectorScopes: [RecruiterCountrySectorScope.HEALTHCARE],
          country: { name: 'Saudi Arabia' },
        },
      ]);
      prisma.userCountryCoverage.findUnique.mockResolvedValue(null);
      prisma.candidateRecruiterAssignment.updateMany.mockResolvedValue({
        count: 1,
      });
      prisma.candidateRecruiterAssignment.create.mockResolvedValue({});
      prisma.userCountryCoverage.deleteMany.mockResolvedValue({ count: 1 });
      prisma.userCountryCoverage.create.mockResolvedValue({});

      const result = await service.transferCountryCoverage(
        'SA',
        'emma',
        {
          destinationCountryCode: 'IE',
          evenSplitAcrossRecruiterIds: ['john-peer', 'emma-peer'],
          reason: 'Profession-based auto split',
        },
        'manager1',
      );

      expect(result.data.transferredCandidateCount).toBe(5);
      expect(result.data.assignments).toEqual([
        {
          targetRecruiterId: 'emma-peer',
          targetRecruiterName: 'Emma',
          transferredCandidateCount: 2,
        },
        {
          targetRecruiterId: 'john-peer',
          targetRecruiterName: 'John',
          transferredCandidateCount: 3,
        },
      ]);
    });

    it('rejects auto-split when a positive has no matching peer among selected', async () => {
      prisma.user.findUnique.mockResolvedValue(baseSourceUser);
      prisma.country.findFirst.mockResolvedValue({
        code: 'IE',
        name: 'Ireland',
      });
      setupCandidateFindMany(prisma.candidate.findMany, [
        nurseCandidate('n1', { firstName: 'Nora', lastName: 'Nurse' }),
        driverCandidate('d1', { firstName: 'Dan', lastName: 'Driver' }),
      ]);
      prisma.userCountryCoverage.findFirst.mockResolvedValue(
        peerFindFirstResult(
          'emma-peer',
          'Emma',
          'emma-peer@example.com',
          [NURSE_PROFESSION],
        ),
      );

      await expect(
        service.transferCountryCoverage(
          'SA',
          'emma',
          {
            destinationCountryCode: 'IE',
            evenSplitAcrossRecruiterIds: ['emma-peer'],
            reason: 'Missing driver peer',
          },
          'manager1',
        ),
      ).rejects.toThrow(/have no selected peer for their profession/);
    });

    it('rejects manual assignment when candidate profession is outside peer scope', async () => {
      prisma.user.findUnique.mockResolvedValue(baseSourceUser);
      prisma.country.findFirst.mockResolvedValue({
        code: 'IE',
        name: 'Ireland',
      });
      setupCandidateFindMany(prisma.candidate.findMany, [
        nurseCandidate('c1', { firstName: 'Nora', lastName: 'Nurse' }),
      ]);
      prisma.userCountryCoverage.findFirst.mockResolvedValue(
        peerFindFirstResult(
          'john',
          'John',
          'j@example.com',
          [DRIVER_PROFESSION],
        ),
      );

      await expect(
        service.transferCountryCoverage(
          'SA',
          'emma',
          {
            destinationCountryCode: 'IE',
            assignments: [{ targetRecruiterId: 'john', candidateIds: ['c1'] }],
            reason: 'Profession mismatch',
          },
          'manager1',
        ),
      ).rejects.toThrow(/profession not in their scope/);
    });
  });

  describe('getTransferHistory', () => {
    it('returns transfer summaries without nested candidates', async () => {
      prisma.countryCoverageTransfer.count.mockResolvedValue(1);
      prisma.countryCoverageTransfer.findMany.mockResolvedValue([
        {
          id: 't1',
          createdAt: new Date('2026-07-17T10:00:00.000Z'),
          reason: 'Move to Ireland',
          transferMode: 'auto_split',
          candidateCount: 400,
          sourceCountryCode: 'SA',
          sourceCountryCodes: ['SA'],
          destinationCountryCode: 'IE',
          destinationCountryCodes: ['IE'],
          sourceUser: { id: 'emma', name: 'Emma' },
          transferredBy: { id: 'manager1', name: 'Manager' },
        },
      ]);

      const result = await service.getTransferHistory('IE', {
        page: 1,
        limit: 10,
      });

      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0].candidateCount).toBe(400);
      expect(result.data.items[0]).not.toHaveProperty('candidates');
      expect(prisma.countryCoverageTransfer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { destinationCountryCode: 'IE' },
              { destinationCountryCodes: { hasSome: ['IE'] } },
            ]),
          }),
          include: {
            sourceUser: { select: { id: true, name: true } },
            transferredBy: { select: { id: true, name: true } },
          },
        }),
      );
    });
  });

  describe('getTransferHistoryCandidates', () => {
    it('returns paginated handoff lines for a transfer', async () => {
      prisma.countryCoverageTransfer.findFirst.mockResolvedValue({
        id: 't1',
        createdAt: new Date('2026-07-17T10:00:00.000Z'),
        candidateCount: 400,
      });
      prisma.countryCoverageTransferCandidate.count.mockResolvedValue(400);
      prisma.countryCoverageTransferCandidate.findMany.mockResolvedValue([
        {
          candidateId: 'c1',
          candidateNameSnapshot: 'Abhi Kumar',
          statusNameSnapshot: 'Interested',
          fromRecruiterId: 'emma',
          toRecruiterId: 'john',
          fromRecruiterNameSnapshot: 'Emma',
          toRecruiterNameSnapshot: 'John',
        },
      ]);

      const result = await service.getTransferHistoryCandidates('IE', 't1', {
        page: 1,
        limit: 10,
      });

      expect(result.data.items[0]).toEqual({
        candidateId: 'c1',
        candidateName: 'Abhi Kumar',
        statusName: 'Interested',
        fromRecruiter: { id: 'emma', name: 'Emma' },
        toRecruiter: { id: 'john', name: 'John' },
      });
      expect(result.data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 400,
        totalPages: 40,
      });
      expect(
        prisma.countryCoverageTransferCandidate.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { transferId: 't1' },
          skip: 0,
          take: 10,
        }),
      );
    });

    it('throws when transfer is not in country scope', async () => {
      prisma.countryCoverageTransfer.findFirst.mockResolvedValue(null);

      await expect(
        service.getTransferHistoryCandidates('IE', 'missing', {
          page: 1,
          limit: 20,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
