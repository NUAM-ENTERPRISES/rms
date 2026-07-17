import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  RecruiterCountrySectorScope,
  UserAccountStatus,
} from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { CountryCoverageService } from '../country-coverage.service';
import { CountryCoverageGroup } from '../dto/query-country-coverage.dto';

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
      prisma.candidate.findMany
        .mockResolvedValueOnce([{ id: 'c1' }])
        .mockResolvedValueOnce([
          {
            id: 'c1',
            firstName: 'Ada',
            lastName: 'Lovelace',
            email: 'ada@example.com',
            mobileNumber: '9876543210',
            countryCode: '+91',
            profileImage: null,
            currentStatus: { statusName: 'Interested' },
          },
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
        },
      ]);
      expect(result.data.allPositiveCandidateIds).toEqual(['c1']);
      expect(result.data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
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
      prisma.candidate.findMany
        .mockResolvedValueOnce(Array.from({ length: 12 }, (_, i) => ({ id: `c${i + 1}` })))
        .mockResolvedValueOnce([
          {
            id: 'c11',
            firstName: 'First11',
            lastName: 'Last11',
            email: null,
            mobileNumber: null,
            countryCode: null,
            profileImage: null,
            currentStatus: { statusName: 'Interested' },
          },
        ]);
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
      expect(result.data.positiveCandidates).toHaveLength(1);
      expect(result.data.allPositiveCandidateIds).toHaveLength(12);
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
          user: { id: 'peer1', name: 'Alpha Peer', email: 'a@example.com' },
        },
        {
          countryCode: 'SA',
          user: { id: 'peer2', name: 'Beta Peer', email: 'b@example.com' },
        },
        {
          countryCode: 'SA',
          user: { id: 'peer3', name: 'Gamma Peer', email: 'c@example.com' },
        },
      ]);

      const result = await service.getTransferPeers('SA', 'emma', {
        page: 1,
        limit: 2,
      });

      expect(result.data.peers).toHaveLength(2);
      expect(result.data.peers[0].name).toBe('Alpha Peer');
      expect(result.data.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
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
          user: { id: 'peer1', name: 'Jane Doe', email: 'jane@example.com' },
        },
      ]);

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
            candidateIds: [],
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
      prisma.candidate.findMany.mockResolvedValue([
        {
          id: 'c1',
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
          mobileNumber: '111',
          countryCode: '+91',
          profileImage: null,
          currentStatus: { statusName: 'Interested' },
        },
        {
          id: 'c2',
          firstName: 'Grace',
          lastName: 'Hopper',
          email: 'grace@example.com',
          mobileNumber: '222',
          countryCode: '+91',
          profileImage: null,
          currentStatus: { statusName: 'Future' },
        },
      ]);

      await expect(
        service.transferCountryCoverage(
          'SA',
          'emma',
          {
            destinationCountryCode: 'IE',
            targetRecruiterId: 'peer1',
            candidateIds: ['c1'],
          },
          'manager1',
        ),
      ).rejects.toThrow(/All positive candidates must be selected/);
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

      const result = await service.transferCountryCoverage(
        'SA',
        'emma',
        {
          destinationCountryCode: 'IE',
          candidateIds: [],
        },
        'manager1',
      );

      expect(result.data.destinationCountryCode).toBe('IE');
      expect(result.data.transferredCandidateCount).toBe(0);
      expect(prisma.userCountryCoverage.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'emma', countryCode: { in: ['SA'] } },
      });
      expect(prisma.userCountryCoverage.create).toHaveBeenCalledWith({
        data: {
          userId: 'emma',
          countryCode: 'IE',
          sectorScopes: [RecruiterCountrySectorScope.HEALTHCARE],
        },
      });
      expect(
        outboxService.publishRecruiterCountryCoverageTransferred,
      ).toHaveBeenCalled();
      expect(auditService.logUserAction).toHaveBeenCalledWith(
        'update',
        'manager1',
        'emma',
        expect.any(Object),
        { action: 'recruiter_country_coverage_transferred' },
      );
    });

    it('hands off candidates then removes GCC coverages', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...baseSourceUser,
        userCountryCoverages: [{ countryCode: 'KW' }, { countryCode: 'OM' }],
      });
      prisma.country.findFirst.mockResolvedValue({
        code: 'IE',
        name: 'Ireland',
      });
      prisma.candidate.findMany.mockResolvedValue([
        {
          id: 'c1',
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
          mobileNumber: '111',
          countryCode: '+91',
          profileImage: null,
          currentStatus: { statusName: 'Interested' },
        },
      ]);
      prisma.userCountryCoverage.findFirst.mockResolvedValue({
        user: {
          id: 'peer1',
          name: 'Peer',
          email: 'peer@example.com',
        },
      });
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
          targetRecruiterId: 'peer1',
          candidateIds: ['c1'],
          reason: 'Move to Ireland',
        },
        'manager1',
      );

      expect(result.data.transferredCandidateCount).toBe(1);
      expect(result.data.targetRecruiterId).toBe('peer1');
      expect(
        prisma.candidateRecruiterAssignment.updateMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { candidateId: 'c1', isActive: true },
        }),
      );
      expect(prisma.candidateRecruiterAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            candidateId: 'c1',
            recruiterId: 'peer1',
          }),
        }),
      );
      expect(prisma.userCountryCoverage.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'emma',
          countryCode: {
            in: expect.arrayContaining(['SA', 'KW', 'OM']),
          },
        },
      });
      expect(prisma.userCountryCoverage.create).toHaveBeenCalledWith({
        data: {
          userId: 'emma',
          countryCode: 'IE',
          sectorScopes: expect.arrayContaining([
            RecruiterCountrySectorScope.HEALTHCARE,
            RecruiterCountrySectorScope.NON_HEALTH_CARE,
          ]),
        },
      });
    });

    it('rejects peer who does not cover the source context', async () => {
      prisma.user.findUnique.mockResolvedValue(baseSourceUser);
      prisma.country.findFirst.mockResolvedValue({
        code: 'IE',
        name: 'Ireland',
      });
      prisma.candidate.findMany.mockResolvedValue([
        {
          id: 'c1',
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
          mobileNumber: '111',
          countryCode: '+91',
          profileImage: null,
          currentStatus: { statusName: 'Interested' },
        },
      ]);
      prisma.userCountryCoverage.findFirst.mockResolvedValue(null);

      await expect(
        service.transferCountryCoverage(
          'SA',
          'emma',
          {
            destinationCountryCode: 'IE',
            targetRecruiterId: 'outsider',
            candidateIds: ['c1'],
          },
          'manager1',
        ),
      ).rejects.toThrow(/same source country/);
    });
  });
});
