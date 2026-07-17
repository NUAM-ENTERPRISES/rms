import { Injectable, NotFoundException } from '@nestjs/common';
import {
  RecruiterCountrySectorScope,
  UserAccountStatus,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { GCC_COUNTRY_CODES } from './constants';
import {
  CountryCoverageGroup,
  QueryCountryCoverageDto,
} from './dto/query-country-coverage.dto';
import { QueryCountryCoverageUsersDto } from './dto/query-country-coverage-users.dto';

export const GCC_GROUP_CODE = 'GCC';

export type CountryCoverageSummaryItem = {
  code: string;
  name: string;
  userCount: number;
  healthcareCount: number;
  nonHealthcareCount: number;
  isGcc: boolean;
};

export type GccCoverageSummary = {
  code: typeof GCC_GROUP_CODE;
  name: string;
  userCount: number;
  healthcareCount: number;
  nonHealthcareCount: number;
  countryCodes: string[];
};

@Injectable()
export class CountryCoverageService {
  constructor(private readonly prisma: PrismaService) {}

  async getCountrySummaries(query: QueryCountryCoverageDto) {
    const group = query.group ?? CountryCoverageGroup.ALL;
    const search = query.search?.trim();
    const sector = query.sector;
    const countryCode = query.countryCode?.trim().toUpperCase();

    const baseUserFilter = { accountStatus: UserAccountStatus.ACTIVE };

    const countryWhere: {
      countryCode?: { in: string[] } | string;
      sectorScopes?: { has: RecruiterCountrySectorScope };
      user: { accountStatus: UserAccountStatus };
      country?: {
        OR: Array<
          | { name: { contains: string; mode: 'insensitive' } }
          | { code: { contains: string; mode: 'insensitive' } }
        >;
      };
    } = {
      user: baseUserFilter,
    };

    if (countryCode && countryCode !== GCC_GROUP_CODE) {
      countryWhere.countryCode = countryCode;
    } else if (group === CountryCoverageGroup.GCC) {
      countryWhere.countryCode = { in: [...GCC_COUNTRY_CODES] };
    }

    if (sector) {
      countryWhere.sectorScopes = { has: sector };
    }

    if (search) {
      countryWhere.country = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const gccWhere: {
      countryCode: { in: string[] };
      sectorScopes?: { has: RecruiterCountrySectorScope };
      user: { accountStatus: UserAccountStatus };
    } = {
      countryCode: { in: [...GCC_COUNTRY_CODES] },
      user: baseUserFilter,
    };
    if (sector) {
      gccWhere.sectorScopes = { has: sector };
    }

    const [rows, gccRows] = await Promise.all([
      this.prisma.userCountryCoverage.findMany({
        where: countryWhere,
        select: {
          userId: true,
          countryCode: true,
          sectorScopes: true,
          country: { select: { code: true, name: true } },
        },
      }),
      this.prisma.userCountryCoverage.findMany({
        where: gccWhere,
        select: {
          userId: true,
          countryCode: true,
          sectorScopes: true,
        },
      }),
    ]);

    const byCode = new Map<
      string,
      {
        code: string;
        name: string;
        userCount: number;
        healthcareCount: number;
        nonHealthcareCount: number;
      }
    >();

    for (const row of rows) {
      const existing = byCode.get(row.countryCode);
      const entry =
        existing ??
        {
          code: row.country.code,
          name: row.country.name,
          userCount: 0,
          healthcareCount: 0,
          nonHealthcareCount: 0,
        };

      entry.userCount += 1;
      if (row.sectorScopes.includes(RecruiterCountrySectorScope.HEALTHCARE)) {
        entry.healthcareCount += 1;
      }
      if (
        row.sectorScopes.includes(RecruiterCountrySectorScope.NON_HEALTH_CARE)
      ) {
        entry.nonHealthcareCount += 1;
      }

      byCode.set(row.countryCode, entry);
    }

    const gccSet = new Set<string>(GCC_COUNTRY_CODES);

    // When filtering to one country, always return that card (0 users if none).
    if (countryCode && countryCode !== GCC_GROUP_CODE && !byCode.has(countryCode)) {
      const country = await this.prisma.country.findUnique({
        where: { code: countryCode },
        select: { code: true, name: true },
      });
      if (!country) {
        throw new NotFoundException(`Country ${countryCode} not found`);
      }
      byCode.set(country.code, {
        code: country.code,
        name: country.name,
        userCount: 0,
        healthcareCount: 0,
        nonHealthcareCount: 0,
      });
    }

    const countries: CountryCoverageSummaryItem[] = Array.from(byCode.values())
      .map((c) => ({
        ...c,
        isGcc: gccSet.has(c.code),
      }))
      .sort((a, b) => {
        if (b.userCount !== a.userCount) return b.userCount - a.userCount;
        return a.name.localeCompare(b.name);
      });

    const gcc = this.aggregateUniqueGcc(gccRows);

    // GCC is returned separately as `gcc`; paginate non-GCC country cards.
    // If a specific countryCode is requested, keep that country in the list.
    const listCountries =
      countryCode && countryCode !== GCC_GROUP_CODE
        ? countries.filter((c) => c.code === countryCode)
        : countries.filter((c) => !c.isGcc);

    const page = query.page ?? 1;
    const limit = query.limit ?? 15;
    const total = listCountries.length;
    const skip = (page - 1) * limit;
    const pagedCountries = listCountries.slice(skip, skip + limit);

    return {
      success: true,
      data: {
        countries: pagedCountries,
        gcc,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 0,
        },
      },
      message: 'Country coverage summary retrieved successfully',
    };
  }

  async getUsersByCountry(
    countryCode: string,
    query: QueryCountryCoverageUsersDto,
  ) {
    const code = countryCode.trim().toUpperCase();
    if (code === GCC_GROUP_CODE) {
      return this.getGccUsers(query);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();
    const sector = query.sector;
    const skip = (page - 1) * limit;

    const country = await this.prisma.country.findUnique({
      where: { code },
      select: { code: true, name: true },
    });

    if (!country) {
      throw new NotFoundException(`Country ${code} not found`);
    }

    const where: {
      countryCode: string;
      sectorScopes?: { has: RecruiterCountrySectorScope };
      user: {
        accountStatus: UserAccountStatus;
        OR?: Array<
          | { name: { contains: string; mode: 'insensitive' } }
          | { email: { contains: string; mode: 'insensitive' } }
        >;
      };
    } = {
      countryCode: code,
      user: { accountStatus: UserAccountStatus.ACTIVE },
    };

    if (sector) {
      where.sectorScopes = { has: sector };
    }

    if (search) {
      where.user.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.userCountryCoverage.count({ where }),
      this.prisma.userCountryCoverage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { user: { name: 'asc' } },
        select: {
          sectorScopes: true,
          countryCode: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profileImage: true,
              mobileNumber: true,
              countryCode: true,
              accountStatus: true,
              userRoles: {
                select: {
                  role: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const users = rows.map((row) => ({
      id: row.user.id,
      name: row.user.name,
      email: row.user.email,
      profileImage: row.user.profileImage,
      mobileNumber: row.user.mobileNumber,
      phoneCountryCode: row.user.countryCode,
      accountStatus: row.user.accountStatus,
      roles: row.user.userRoles.map((ur) => ur.role.name),
      sectorScopes: row.sectorScopes,
      coveredCountryCodes: [row.countryCode],
    }));

    return {
      success: true,
      data: {
        country,
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 0,
        },
      },
      message: 'Country coverage users retrieved successfully',
    };
  }

  private aggregateUniqueGcc(
    gccRows: Array<{
      userId: string;
      countryCode: string;
      sectorScopes: RecruiterCountrySectorScope[];
    }>,
  ): GccCoverageSummary {
    const byUser = new Map<
      string,
      {
        healthcare: boolean;
        nonHealthcare: boolean;
        countries: Set<string>;
      }
    >();

    for (const row of gccRows) {
      const entry = byUser.get(row.userId) ?? {
        healthcare: false,
        nonHealthcare: false,
        countries: new Set<string>(),
      };
      entry.countries.add(row.countryCode);
      if (row.sectorScopes.includes(RecruiterCountrySectorScope.HEALTHCARE)) {
        entry.healthcare = true;
      }
      if (
        row.sectorScopes.includes(RecruiterCountrySectorScope.NON_HEALTH_CARE)
      ) {
        entry.nonHealthcare = true;
      }
      byUser.set(row.userId, entry);
    }

    let healthcareCount = 0;
    let nonHealthcareCount = 0;
    for (const entry of byUser.values()) {
      if (entry.healthcare) healthcareCount += 1;
      if (entry.nonHealthcare) nonHealthcareCount += 1;
    }

    return {
      code: GCC_GROUP_CODE,
      name: 'GCC',
      userCount: byUser.size,
      healthcareCount,
      nonHealthcareCount,
      countryCodes: [...GCC_COUNTRY_CODES],
    };
  }

  private async getGccUsers(query: QueryCountryCoverageUsersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();
    const sector = query.sector;
    const coveredCountry = query.coveredCountry?.trim().toUpperCase();
    const skip = (page - 1) * limit;

    const where: {
      countryCode: { in: string[] };
      sectorScopes?: { has: RecruiterCountrySectorScope };
      user: {
        accountStatus: UserAccountStatus;
        OR?: Array<
          | { name: { contains: string; mode: 'insensitive' } }
          | { email: { contains: string; mode: 'insensitive' } }
        >;
      };
    } = {
      countryCode: { in: [...GCC_COUNTRY_CODES] },
      user: { accountStatus: UserAccountStatus.ACTIVE },
    };

    if (sector) {
      where.sectorScopes = { has: sector };
    }

    if (search) {
      where.user.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.userCountryCoverage.findMany({
      where,
      select: {
        countryCode: true,
        sectorScopes: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
            mobileNumber: true,
            countryCode: true,
            accountStatus: true,
            userRoles: {
              select: {
                role: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    const byUser = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        profileImage: string | null;
        mobileNumber: string;
        phoneCountryCode: string;
        accountStatus: UserAccountStatus;
        roles: string[];
        sectorScopes: Set<RecruiterCountrySectorScope>;
        coveredCountryCodes: Set<string>;
      }
    >();

    for (const row of rows) {
      const existing = byUser.get(row.user.id);
      if (existing) {
        for (const scope of row.sectorScopes) existing.sectorScopes.add(scope);
        existing.coveredCountryCodes.add(row.countryCode);
      } else {
        byUser.set(row.user.id, {
          id: row.user.id,
          name: row.user.name,
          email: row.user.email,
          profileImage: row.user.profileImage,
          mobileNumber: row.user.mobileNumber,
          phoneCountryCode: row.user.countryCode,
          accountStatus: row.user.accountStatus,
          roles: row.user.userRoles.map((ur) => ur.role.name),
          sectorScopes: new Set(row.sectorScopes),
          coveredCountryCodes: new Set([row.countryCode]),
        });
      }
    }

    // Tile counts always reflect full GCC coverage (search/sector only).
    const countByCode = new Map<string, number>();
    for (const code of GCC_COUNTRY_CODES) {
      countByCode.set(code, 0);
    }
    for (const row of rows) {
      countByCode.set(
        row.countryCode,
        (countByCode.get(row.countryCode) ?? 0) + 1,
      );
    }

    const countries = await this.prisma.country.findMany({
      where: { code: { in: [...GCC_COUNTRY_CODES] } },
      select: { code: true, name: true },
    });
    const nameByCode = new Map(countries.map((c) => [c.code, c.name]));

    const countryBreakdown = GCC_COUNTRY_CODES.map((code) => ({
      code,
      name: nameByCode.get(code) ?? code,
      userCount: countByCode.get(code) ?? 0,
    }));

    let allUsers = Array.from(byUser.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    const uniqueUserCount = allUsers.length;

    if (
      coveredCountry &&
      (GCC_COUNTRY_CODES as readonly string[]).includes(coveredCountry)
    ) {
      allUsers = allUsers.filter((u) =>
        u.coveredCountryCodes.has(coveredCountry),
      );
    }

    const total = allUsers.length;
    const pageUsers = allUsers.slice(skip, skip + limit).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      profileImage: u.profileImage,
      mobileNumber: u.mobileNumber,
      phoneCountryCode: u.phoneCountryCode,
      accountStatus: u.accountStatus,
      roles: u.roles,
      sectorScopes: Array.from(u.sectorScopes),
      coveredCountryCodes: Array.from(u.coveredCountryCodes).sort(),
    }));

    return {
      success: true,
      data: {
        country: { code: GCC_GROUP_CODE, name: 'GCC' },
        users: pageUsers,
        countryBreakdown,
        uniqueUserCount,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 0,
        },
      },
      message: 'GCC coverage users retrieved successfully',
    };
  }
}
