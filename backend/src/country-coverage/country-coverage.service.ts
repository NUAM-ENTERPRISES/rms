import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  RecruiterCountrySectorScope,
  UserAccountStatus,
} from '@prisma/client';
import { AuditService } from '../common/audit/audit.service';
import { ROLE_NAMES } from '../common/constants/role-ids';
import { PrismaService } from '../database/prisma.service';
import { OutboxService } from '../notifications/outbox.service';
import { GCC_COUNTRY_CODES } from './constants';
import {
  CountryCoverageGroup,
  QueryCountryCoverageDto,
} from './dto/query-country-coverage.dto';
import { QueryCountryCoverageUsersDto } from './dto/query-country-coverage-users.dto';
import { TransferCountryCoverageDto } from './dto/transfer-country-coverage.dto';
import { QueryTransferPreviewDto } from './dto/query-transfer-preview.dto';

export const GCC_GROUP_CODE = 'GCC';

/** CRM statuses eligible for country-coverage handoff (positive pipeline). */
const POSITIVE_CRM_STATUS_NAMES = [
  'Interested',
  'Future',
  'On Hold',
  'Call Back',
  'Qualified',
] as const;

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

export type TransferPreviewCandidate = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string | null;
  mobileNumber: string | null;
  phoneCountryCode: string | null;
  profileImage: string | null;
  statusName: string;
};

export type TransferPreviewPeer = {
  id: string;
  name: string;
  email: string;
  coveredCountryCodes: string[];
};

export type TransferPreviewCoverage = {
  countryCode: string;
  countryName: string;
  sectorScopes: RecruiterCountrySectorScope[];
};

@Injectable()
export class CountryCoverageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly auditService: AuditService,
  ) {}

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

    const baseUserFilter: {
      accountStatus: UserAccountStatus;
      OR?: Array<
        | { name: { contains: string; mode: 'insensitive' } }
        | { email: { contains: string; mode: 'insensitive' } }
      >;
    } = { accountStatus: UserAccountStatus.ACTIVE };

    if (search) {
      baseUserFilter.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const where: {
      countryCode: string;
      sectorScopes?: { has: RecruiterCountrySectorScope };
      user: typeof baseUserFilter;
    } = {
      countryCode: code,
      user: baseUserFilter,
    };

    if (sector) {
      where.sectorScopes = { has: sector };
    }

    // Summary tiles ignore sector filter so counts stay stable while filtering.
    const summaryWhere = {
      countryCode: code,
      user: baseUserFilter,
    };

    const [total, rows, summaryRows] = await Promise.all([
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
      this.prisma.userCountryCoverage.findMany({
        where: summaryWhere,
        select: { sectorScopes: true },
      }),
    ]);

    let healthcareCount = 0;
    let nonHealthcareCount = 0;
    for (const row of summaryRows) {
      if (row.sectorScopes.includes(RecruiterCountrySectorScope.HEALTHCARE)) {
        healthcareCount += 1;
      }
      if (
        row.sectorScopes.includes(RecruiterCountrySectorScope.NON_HEALTH_CARE)
      ) {
        nonHealthcareCount += 1;
      }
    }

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
        summary: {
          userCount: summaryRows.length,
          healthcareCount,
          nonHealthcareCount,
        },
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

  /**
   * Preview handoff + country move for a recruiter covering the given source context.
   * Positive candidates are server-paginated (default 10) for performance.
   */
  async getTransferPreview(
    sourceCountryCode: string,
    userId: string,
    query: QueryTransferPreviewDto = {},
  ) {
    const sourceCodes = this.resolveSourceCountryCodes(sourceCountryCode);
    const sourceUser = await this.requireCoveringUser(userId, sourceCodes);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [positivePage, currentCoverages] = await Promise.all([
      this.findPositiveCandidatesForRecruiter(userId, { page, limit }),
      this.findRemovableCoverages(userId, sourceCodes),
    ]);

    return {
      success: true,
      data: {
        sourceUser: {
          id: sourceUser.id,
          name: sourceUser.name,
          email: sourceUser.email,
        },
        sourceCountryCode: sourceCountryCode.trim().toUpperCase(),
        sourceCountryCodes: sourceCodes,
        positiveCandidates: positivePage.items,
        allPositiveCandidateIds: positivePage.allIds,
        currentCoverages,
        requiresCandidateHandoff: positivePage.total > 0,
        pagination: {
          page,
          limit,
          total: positivePage.total,
          totalPages: Math.ceil(positivePage.total / limit) || 0,
        },
      },
      message: 'Country coverage transfer preview retrieved successfully',
    };
  }

  /**
   * Paginated same-source peer recruiters for country-coverage handoff.
   */
  async getTransferPeers(
    sourceCountryCode: string,
    userId: string,
    query: { page?: number; limit?: number; search?: string } = {},
  ) {
    const sourceCodes = this.resolveSourceCountryCodes(sourceCountryCode);
    await this.requireCoveringUser(userId, sourceCodes);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();

    const peerPage = await this.findPeerRecruiters(userId, sourceCodes, {
      page,
      limit,
      search,
    });

    return {
      success: true,
      data: {
        peers: peerPage.items,
        pagination: {
          page,
          limit,
          total: peerPage.total,
          totalPages: Math.ceil(peerPage.total / limit) || 0,
        },
      },
      message: 'Country coverage transfer peers retrieved successfully',
    };
  }

  /**
   * Hand off all positive candidates to a same-source peer, then move coverage
   * to the destination country.
   */
  async transferCountryCoverage(
    sourceCountryCode: string,
    userId: string,
    dto: TransferCountryCoverageDto,
    actorUserId: string,
  ) {
    const sourceCodes = this.resolveSourceCountryCodes(sourceCountryCode);
    const sourceKey = sourceCountryCode.trim().toUpperCase();
    const destinationCode = dto.destinationCountryCode.trim().toUpperCase();

    if (sourceCodes.includes(destinationCode)) {
      throw new BadRequestException(
        'Destination country must be outside the source coverage being transferred',
      );
    }

    const sourceUser = await this.requireCoveringUser(userId, sourceCodes);

    const destination = await this.prisma.country.findFirst({
      where: { code: destinationCode, isActive: true },
      select: { code: true, name: true },
    });
    if (!destination) {
      throw new NotFoundException(
        `Destination country ${destinationCode} not found or inactive`,
      );
    }

    const positiveIds = new Set(
      await this.findPositiveCandidateIdsForRecruiter(userId),
    );
    const requestedIds = [...new Set(dto.candidateIds ?? [])];

    if (positiveIds.size === 0) {
      if (requestedIds.length > 0) {
        throw new BadRequestException(
          'No positive candidates to transfer; candidateIds must be empty',
        );
      }
    } else {
      if (!dto.targetRecruiterId?.trim()) {
        throw new BadRequestException(
          'targetRecruiterId is required when the recruiter has positive candidates',
        );
      }
      if (requestedIds.length !== positiveIds.size) {
        throw new BadRequestException(
          'All positive candidates must be selected for handoff before coverage can move',
        );
      }
      for (const id of requestedIds) {
        if (!positiveIds.has(id)) {
          throw new BadRequestException(
            `Candidate ${id} is not a positive candidate assigned to this recruiter`,
          );
        }
      }
    }

    let targetRecruiter: {
      id: string;
      name: string;
      email: string;
    } | null = null;

    if (dto.targetRecruiterId?.trim()) {
      targetRecruiter = await this.findPeerRecruiterById(
        userId,
        sourceCodes,
        dto.targetRecruiterId,
      );
      if (!targetRecruiter) {
        throw new BadRequestException(
          'Target recruiter must be an active recruiter covering the same source country/GCC',
        );
      }
      if (positiveIds.size === 0) {
        throw new BadRequestException(
          'targetRecruiterId must not be set when there are no positive candidates',
        );
      }
    }

    const removable = await this.findRemovableCoverages(userId, sourceCodes);
    if (removable.length === 0) {
      throw new BadRequestException(
        'Source recruiter has no coverage rows matching the source country context',
      );
    }

    const sectorScopes = this.unionSectorScopes(
      removable.map((r) => r.sectorScopes),
    );
    const reason =
      dto.reason?.trim() ||
      `Country coverage transfer from ${sourceKey} to ${destinationCode}`;

    await this.prisma.$transaction(async (tx) => {
      if (targetRecruiter && requestedIds.length > 0) {
        for (const candidateId of requestedIds) {
          await tx.candidateRecruiterAssignment.updateMany({
            where: { candidateId, isActive: true },
            data: {
              isActive: false,
              unassignedAt: new Date(),
              unassignedBy: actorUserId,
            },
          });
          await tx.candidateRecruiterAssignment.create({
            data: {
              candidateId,
              recruiterId: targetRecruiter.id,
              assignedBy: actorUserId,
              createdBy: actorUserId,
              reason,
              assignmentType: 'manual',
            },
          });
        }
      }

      await tx.userCountryCoverage.deleteMany({
        where: {
          userId,
          countryCode: { in: sourceCodes },
        },
      });

      const existingDestination = await tx.userCountryCoverage.findUnique({
        where: {
          userId_countryCode: {
            userId,
            countryCode: destinationCode,
          },
        },
      });

      if (existingDestination) {
        const merged = this.unionSectorScopes([
          existingDestination.sectorScopes,
          sectorScopes,
        ]);
        await tx.userCountryCoverage.update({
          where: { id: existingDestination.id },
          data: { sectorScopes: merged },
        });
      } else {
        await tx.userCountryCoverage.create({
          data: {
            userId,
            countryCode: destinationCode,
            sectorScopes,
          },
        });
      }
    });

    await this.auditService.logUserAction(
      'update',
      actorUserId,
      userId,
      {
        sourceCountryCode: sourceKey,
        sourceCountryCodes: sourceCodes,
        destinationCountryCode: destinationCode,
        targetRecruiterId: targetRecruiter?.id ?? null,
        candidateIds: requestedIds,
        reason,
      },
      { action: 'recruiter_country_coverage_transferred' },
    );

    await this.outboxService.publishRecruiterCountryCoverageTransferred({
      sourceUserId: userId,
      sourceUserName: sourceUser.name,
      targetRecruiterId: targetRecruiter?.id ?? null,
      targetRecruiterName: targetRecruiter?.name ?? null,
      transferredBy: actorUserId,
      sourceCountryCode: sourceKey,
      sourceCountryCodes: sourceCodes,
      destinationCountryCode: destinationCode,
      destinationCountryName: destination.name,
      candidateIds: requestedIds,
      candidateCount: requestedIds.length,
      reason,
    });

    return {
      success: true,
      data: {
        sourceUserId: userId,
        destinationCountryCode: destinationCode,
        destinationCountryName: destination.name,
        targetRecruiterId: targetRecruiter?.id ?? null,
        transferredCandidateCount: requestedIds.length,
        removedCountryCodes: sourceCodes,
      },
      message: `Transferred coverage for ${sourceUser.name} to ${destination.name}`,
    };
  }

  private resolveSourceCountryCodes(sourceCountryCode: string): string[] {
    const code = sourceCountryCode.trim().toUpperCase();
    if (code === GCC_GROUP_CODE) {
      return [...GCC_COUNTRY_CODES];
    }
    return [code];
  }

  private async requireCoveringUser(userId: string, sourceCodes: string[]) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        accountStatus: true,
        userCountryCoverages: {
          where: { countryCode: { in: sourceCodes } },
          select: { countryCode: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    if (user.accountStatus !== UserAccountStatus.ACTIVE) {
      throw new BadRequestException('Source user must be active');
    }
    if (user.userCountryCoverages.length === 0) {
      throw new BadRequestException(
        'User does not cover the requested source country context',
      );
    }

    return user;
  }

  private positiveCandidateWhere(recruiterId: string) {
    return {
      recruiterAssignments: {
        some: { recruiterId, isActive: true },
      },
      currentStatus: {
        OR: POSITIVE_CRM_STATUS_NAMES.map((statusName) => ({
          statusName: { equals: statusName, mode: 'insensitive' as const },
        })),
      },
    };
  }

  /** Lightweight id list for transfer validation / select-all (no profile payload). */
  private async findPositiveCandidateIdsForRecruiter(
    recruiterId: string,
  ): Promise<string[]> {
    const rows = await this.prisma.candidate.findMany({
      where: this.positiveCandidateWhere(recruiterId),
      select: { id: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    return rows.map((row) => row.id);
  }

  private async findPositiveCandidatesForRecruiter(
    recruiterId: string,
    opts: { page: number; limit: number },
  ): Promise<{
    items: TransferPreviewCandidate[];
    total: number;
    allIds: string[];
  }> {
    const where = this.positiveCandidateWhere(recruiterId);
    const skip = (opts.page - 1) * opts.limit;

    const [total, allIdRows, rows] = await Promise.all([
      this.prisma.candidate.count({ where }),
      this.prisma.candidate.findMany({
        where,
        select: { id: true },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      }),
      this.prisma.candidate.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          mobileNumber: true,
          countryCode: true,
          profileImage: true,
          currentStatus: { select: { statusName: true } },
        },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        skip,
        take: opts.limit,
      }),
    ]);

    return {
      total,
      allIds: allIdRows.map((row) => row.id),
      items: rows.map((row) => ({
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        name: `${row.firstName} ${row.lastName}`.trim(),
        email: row.email ?? null,
        mobileNumber: row.mobileNumber ?? null,
        phoneCountryCode: row.countryCode ?? null,
        profileImage: row.profileImage ?? null,
        statusName: row.currentStatus?.statusName ?? 'Unknown',
      })),
    };
  }

  private async findPeerRecruiterById(
    excludeUserId: string,
    sourceCodes: string[],
    peerUserId: string,
  ): Promise<{ id: string; name: string; email: string } | null> {
    const coverage = await this.prisma.userCountryCoverage.findFirst({
      where: {
        countryCode: { in: sourceCodes },
        userId: peerUserId,
        user: {
          id: { not: excludeUserId },
          accountStatus: UserAccountStatus.ACTIVE,
          userRoles: {
            some: {
              role: { name: ROLE_NAMES.RECRUITER },
            },
          },
        },
      },
      select: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return coverage?.user ?? null;
  }

  private async findPeerRecruiters(
    excludeUserId: string,
    sourceCodes: string[],
    opts: { page: number; limit: number; search?: string },
  ): Promise<{ items: TransferPreviewPeer[]; total: number }> {
    const search = opts.search?.trim();

    const userFilter: {
      accountStatus: UserAccountStatus;
      userRoles: {
        some: { role: { name: string } };
      };
      OR?: Array<
        | { name: { contains: string; mode: 'insensitive' } }
        | { email: { contains: string; mode: 'insensitive' } }
      >;
    } = {
      accountStatus: UserAccountStatus.ACTIVE,
      userRoles: {
        some: {
          role: { name: ROLE_NAMES.RECRUITER },
        },
      },
    };

    if (search) {
      userFilter.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.userCountryCoverage.findMany({
      where: {
        countryCode: { in: sourceCodes },
        userId: { not: excludeUserId },
        user: userFilter,
      },
      select: {
        countryCode: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    const byUser = new Map<string, TransferPreviewPeer>();
    for (const row of rows) {
      const existing = byUser.get(row.user.id);
      if (existing) {
        if (!existing.coveredCountryCodes.includes(row.countryCode)) {
          existing.coveredCountryCodes.push(row.countryCode);
        }
      } else {
        byUser.set(row.user.id, {
          id: row.user.id,
          name: row.user.name,
          email: row.user.email,
          coveredCountryCodes: [row.countryCode],
        });
      }
    }

    const allPeers = Array.from(byUser.values())
      .map((p) => ({
        ...p,
        coveredCountryCodes: p.coveredCountryCodes.sort(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const total = allPeers.length;
    const skip = (opts.page - 1) * opts.limit;
    const items = allPeers.slice(skip, skip + opts.limit);

    return { items, total };
  }

  private async findRemovableCoverages(
    userId: string,
    sourceCodes: string[],
  ): Promise<TransferPreviewCoverage[]> {
    const rows = await this.prisma.userCountryCoverage.findMany({
      where: {
        userId,
        countryCode: { in: sourceCodes },
      },
      select: {
        countryCode: true,
        sectorScopes: true,
        country: { select: { name: true } },
      },
      orderBy: { countryCode: 'asc' },
    });

    return rows.map((row) => ({
      countryCode: row.countryCode,
      countryName: row.country.name,
      sectorScopes: row.sectorScopes,
    }));
  }

  private unionSectorScopes(
    lists: RecruiterCountrySectorScope[][],
  ): RecruiterCountrySectorScope[] {
    const set = new Set<RecruiterCountrySectorScope>();
    for (const list of lists) {
      for (const scope of list) set.add(scope);
    }
    return Array.from(set);
  }
}
