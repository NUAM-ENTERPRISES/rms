import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  RecruiterCountrySectorScope,
  UserAccountStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CountryCoverageService } from '../country-coverage.service';
import { CountryCoverageGroup } from '../dto/query-country-coverage.dto';

describe('CountryCoverageService', () => {
  let service: CountryCoverageService;
  let prisma: {
    userCountryCoverage: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
    country: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      userCountryCoverage: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      country: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CountryCoverageService,
        { provide: PrismaService, useValue: prisma },
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
      // GCC countries are excluded from the paginated card list.
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

    it('paginates non-GCC countries with limit', async () => {
      const rows = Array.from({ length: 16 }, (_, i) => ({
        userId: `u${i}`,
        countryCode: `C${String(i).padStart(2, '0')}`,
        sectorScopes: [RecruiterCountrySectorScope.HEALTHCARE],
        country: {
          code: `C${String(i).padStart(2, '0')}`,
          name: `Country ${String(i).padStart(2, '0')}`,
        },
      }));
      // Each getCountrySummaries call does Promise.all([rows, gccRows]).
      prisma.userCountryCoverage.findMany.mockImplementation(
        async (args: { where?: { countryCode?: unknown } }) => {
          const isGccQuery =
            args?.where?.countryCode &&
            typeof args.where.countryCode === 'object' &&
            args.where.countryCode !== null &&
            'in' in args.where.countryCode;
          return isGccQuery ? [] : rows;
        },
      );

      const result = await service.getCountrySummaries({ page: 1, limit: 15 });

      expect(result.data.countries).toHaveLength(15);
      expect(result.data.pagination).toEqual({
        page: 1,
        limit: 15,
        total: 16,
        totalPages: 2,
      });

      const page2 = await service.getCountrySummaries({ page: 2, limit: 15 });
      expect(page2.data.countries).toHaveLength(1);
      expect(page2.data.pagination.page).toBe(2);
    });

    it('restricts country list to GCC codes when group=gcc', async () => {
      prisma.userCountryCoverage.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.getCountrySummaries({ group: CountryCoverageGroup.GCC });

      expect(prisma.userCountryCoverage.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: expect.objectContaining({
            countryCode: { in: ['SA', 'AE', 'QA', 'OM', 'BH', 'KW'] },
            user: { accountStatus: UserAccountStatus.ACTIVE },
          }),
        }),
      );
    });

    it('filters by sector has', async () => {
      prisma.userCountryCoverage.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.getCountrySummaries({
        sector: RecruiterCountrySectorScope.HEALTHCARE,
      });

      expect(prisma.userCountryCoverage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sectorScopes: { has: RecruiterCountrySectorScope.HEALTHCARE },
          }),
        }),
      );
    });

    it('returns empty countries when no coverage rows', async () => {
      prisma.userCountryCoverage.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getCountrySummaries({});

      expect(result.data.countries).toEqual([]);
      expect(result.data.gcc.userCount).toBe(0);
    });

    it('returns selected country with 0 users when it has no coverage', async () => {
      prisma.userCountryCoverage.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prisma.country.findUnique.mockResolvedValue({
        code: 'QA',
        name: 'Qatar',
      });

      const result = await service.getCountrySummaries({ countryCode: 'QA' });

      expect(result.data.countries).toEqual([
        {
          code: 'QA',
          name: 'Qatar',
          userCount: 0,
          healthcareCount: 0,
          nonHealthcareCount: 0,
          isGcc: true,
        },
      ]);
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
      expect(result.data.summary).toEqual({
        userCount: 1,
        healthcareCount: 1,
        nonHealthcareCount: 0,
      });
      expect(result.data.users).toEqual([
        {
          id: 'u1',
          name: 'Jane Recruiter',
          email: 'jane@example.com',
          profileImage: null,
          mobileNumber: '9876543210',
          phoneCountryCode: '+91',
          accountStatus: UserAccountStatus.ACTIVE,
          roles: ['Recruiter'],
          sectorScopes: [RecruiterCountrySectorScope.HEALTHCARE],
          coveredCountryCodes: ['SA'],
        },
      ]);
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
      expect(result.data.users[0].mobileNumber).toBe('111');
      expect(result.data.pagination.total).toBe(1);
      expect(result.data.uniqueUserCount).toBe(1);
      expect(result.data.countryBreakdown).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'KW', userCount: 1 }),
          expect.objectContaining({ code: 'OM', userCount: 1 }),
          expect.objectContaining({ code: 'QA', userCount: 0 }),
        ]),
      );
    });

    it('filters GCC users by coveredCountry tile selection', async () => {
      prisma.userCountryCoverage.findMany.mockResolvedValue([
        {
          countryCode: 'KW',
          sectorScopes: [RecruiterCountrySectorScope.HEALTHCARE],
          user: {
            id: 'u1',
            name: 'Jane',
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
          sectorScopes: [RecruiterCountrySectorScope.HEALTHCARE],
          user: {
            id: 'u2',
            name: 'Omar',
            email: 'omar@example.com',
            profileImage: null,
            mobileNumber: '222',
            countryCode: '+968',
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
        coveredCountry: 'KW',
      });

      expect(result.data.users).toHaveLength(1);
      expect(result.data.users[0].id).toBe('u1');
      expect(result.data.pagination.total).toBe(1);
      expect(result.data.uniqueUserCount).toBe(2);
      // Tiles still show full breakdown
      expect(result.data.countryBreakdown).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'KW', userCount: 1 }),
          expect.objectContaining({ code: 'OM', userCount: 1 }),
        ]),
      );
    });

    it('throws when country is missing', async () => {
      prisma.country.findUnique.mockResolvedValue(null);

      await expect(service.getUsersByCountry('ZZ', {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
