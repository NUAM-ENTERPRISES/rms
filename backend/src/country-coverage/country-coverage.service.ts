import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ProfessionSector,
  RecruiterCountrySectorScope,
  RecruiterProfessionScope,
  UserAccountStatus,
} from '@prisma/client';
import { AuditService } from '../common/audit/audit.service';
import { ROLE_NAMES, roleNameAliases, isRecruiterRole } from '../common/constants/role-ids';
import { PrismaService } from '../database/prisma.service';
import { OutboxService } from '../notifications/outbox.service';
import { anyProfessionFocusLabel } from '../candidates/utils/profession-focus.util';
import { recruiterCoversProfession } from '../users/profession-coverage.util';
import { GCC_COUNTRY_CODES } from './constants';
import {
  CountryCoverageGroup,
  QueryCountryCoverageDto,
} from './dto/query-country-coverage.dto';
import { QueryCountryCoverageUsersDto } from './dto/query-country-coverage-users.dto';
import { TransferCountryCoverageDto } from './dto/transfer-country-coverage.dto';
import { QueryTransferPreviewDto } from './dto/query-transfer-preview.dto';
import { QueryTransferHistoryDto } from './dto/query-transfer-history.dto';

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

export type TransferProfessionSector = ProfessionSector | null;

export type TransferProfessionScope = {
  id: string;
  label: string;
  sector: TransferProfessionSector;
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
  professionTypeId: string | null;
  professionLabel: string;
  sector: TransferProfessionSector;
};

export type TransferPreviewPeer = {
  id: string;
  name: string;
  email: string;
  mobileNumber: string | null;
  phoneCountryCode: string | null;
  profileImage: string | null;
  positiveCandidateCount: number;
  coveredCountryCodes: string[];
  professionScopes: TransferProfessionScope[];
  sectorScopes: ProfessionSector[];
  handlesAllProfessions: boolean;
  recruiterSectorScope: RecruiterProfessionScope | null;
};

export type TransferPreviewCoverage = {
  countryCode: string;
  countryName: string;
  sectorScopes: RecruiterCountrySectorScope[];
};

export type PositiveCandidateProfession = {
  id: string;
  professionTypeId: string | null;
  professionLabel: string;
  sector: TransferProfessionSector;
};

function professionPartitionKey(
  professionTypeId: string | null,
  sector?: ProfessionSector | null,
): string {
  return professionTypeId ?? `__any__:${sector ?? 'unknown'}`;
}

type PeerRef = {
  id: string;
  name: string;
  email: string;
  professionTypeIds: Set<string>;
  handlesAllProfessions: boolean;
  recruiterSectorScope: RecruiterProfessionScope | null;
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

    const [positivePage, currentCoverages, positiveCandidateProfessions] =
      await Promise.all([
        this.findPositiveCandidatesForRecruiter(userId, { page, limit }),
        this.findRemovableCoverages(userId, sourceCodes),
        this.findPositiveCandidateProfessionsForRecruiter(userId),
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
        positiveCandidateProfessions,
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
    const destinationCodes = this.resolveSourceCountryCodes(destinationCode);

    if (destinationCodes.some((code) => sourceCodes.includes(code))) {
      throw new BadRequestException(
        'Destination country must be outside the source coverage being transferred',
      );
    }

    const sourceUser = await this.requireCoveringUser(userId, sourceCodes);

    let destination: { code: string; name: string };
    if (destinationCode === GCC_GROUP_CODE) {
      const gccCountries = await this.prisma.country.findMany({
        where: {
          code: { in: [...GCC_COUNTRY_CODES] },
          isActive: true,
        },
        select: { code: true },
      });
      if (gccCountries.length !== GCC_COUNTRY_CODES.length) {
        throw new BadRequestException(
          'One or more GCC destination countries are missing or inactive',
        );
      }
      destination = { code: GCC_GROUP_CODE, name: 'GCC' };
    } else {
      const row = await this.prisma.country.findFirst({
        where: { code: destinationCode, isActive: true },
        select: { code: true, name: true },
      });
      if (!row) {
        throw new NotFoundException(
          `Destination country ${destinationCode} not found or inactive`,
        );
      }
      destination = row;
    }

    const positiveIdList =
      await this.findPositiveCandidateIdsForRecruiter(userId);
    const positiveIds = new Set(positiveIdList);

    const hasAssignments = (dto.assignments?.length ?? 0) > 0;
    const evenSplitPeerIds = [
      ...new Set(
        (dto.evenSplitAcrossRecruiterIds ?? [])
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ];
    const hasEvenSplit = evenSplitPeerIds.length > 0;

    if (positiveIds.size === 0) {
      if (hasAssignments || hasEvenSplit) {
        throw new BadRequestException(
          'No positive candidates to transfer; assignments and evenSplitAcrossRecruiterIds must be omitted',
        );
      }
    } else if (hasAssignments && hasEvenSplit) {
      throw new BadRequestException(
        'Provide either assignments or evenSplitAcrossRecruiterIds, not both',
      );
    } else if (!hasAssignments && !hasEvenSplit) {
      throw new BadRequestException(
        'Positive candidates require either assignments or evenSplitAcrossRecruiterIds',
      );
    }

    type ResolvedAssignment = {
      peer: PeerRef;
      candidateIds: string[];
    };

    let resolvedAssignments: ResolvedAssignment[] = [];

    if (positiveIds.size > 0) {
      if (hasEvenSplit) {
        const peers: PeerRef[] = [];
        for (const peerId of evenSplitPeerIds) {
          const peer = await this.findPeerRecruiterById(
            userId,
            sourceCodes,
            peerId,
          );
          if (!peer) {
            throw new BadRequestException(
              'Each even-split recruiter must be an active recruiter covering the same source country/GCC',
            );
          }
          peers.push(peer);
        }
        peers.sort((a, b) => a.id.localeCompare(b.id));

        const positiveWithProfession =
          await this.findPositiveCandidatesWithProfessionForRecruiter(userId);
        const buckets = this.partitionByProfessionMatch(
          positiveWithProfession,
          peers,
        );
        resolvedAssignments = peers
          .map((peer) => ({
            peer,
            candidateIds: buckets.get(peer.id) ?? [],
          }))
          .filter((a) => a.candidateIds.length > 0);
      } else {
        const seenCandidateIds = new Set<string>();
        const seenPeerIds = new Set<string>();
        const professionByCandidateId = new Map(
          (
            await this.findPositiveCandidatesWithProfessionForRecruiter(userId)
          ).map((c) => [c.id, c]),
        );

        for (const group of dto.assignments ?? []) {
          const peerId = group.targetRecruiterId?.trim();
          if (!peerId) {
            throw new BadRequestException(
              'Each assignment requires a targetRecruiterId',
            );
          }
          if (seenPeerIds.has(peerId)) {
            throw new BadRequestException(
              `Duplicate targetRecruiterId in assignments: ${peerId}`,
            );
          }
          seenPeerIds.add(peerId);

          const candidateIds = [...new Set(group.candidateIds ?? [])];
          if (candidateIds.length === 0) {
            throw new BadRequestException(
              'Each assignment must include at least one candidateId',
            );
          }

          for (const id of candidateIds) {
            if (!positiveIds.has(id)) {
              throw new BadRequestException(
                `Candidate ${id} is not a positive candidate assigned to this recruiter`,
              );
            }
            if (seenCandidateIds.has(id)) {
              throw new BadRequestException(
                `Candidate ${id} is assigned to more than one peer`,
              );
            }
            seenCandidateIds.add(id);
          }

          const peer = await this.findPeerRecruiterById(
            userId,
            sourceCodes,
            peerId,
          );
          if (!peer) {
            throw new BadRequestException(
              'Target recruiter must be an active recruiter covering the same source country/GCC',
            );
          }

          for (const id of candidateIds) {
            const candidate = professionByCandidateId.get(id);
            if (
              !candidate ||
              !this.peerCoversProfession(peer, candidate)
            ) {
              throw new BadRequestException(
                `Candidate ${candidate?.name ?? id} (${candidate?.professionLabel ?? 'unknown profession'}) cannot be assigned to ${peer.name} — profession not in their scope`,
              );
            }
          }

          resolvedAssignments.push({ peer, candidateIds });
        }

        if (seenCandidateIds.size !== positiveIds.size) {
          throw new BadRequestException(
            'All positive candidates must be assigned to a peer before coverage can move',
          );
        }
      }
    }

    const allTransferredIds = resolvedAssignments.flatMap(
      (a) => a.candidateIds,
    );

    const transferMode =
      positiveIds.size === 0
        ? 'coverage_only'
        : hasEvenSplit
          ? 'auto_split'
          : 'manual';

    const removable = await this.findRemovableCoverages(userId, sourceCodes);
    if (removable.length === 0) {
      throw new BadRequestException(
        'Source recruiter has no coverage rows matching the source country context',
      );
    }

    const sectorScopes = this.unionSectorScopes(
      removable.map((r) => r.sectorScopes),
    );
    const reason = dto.reason.trim();

    const candidateSnapshotRows =
      allTransferredIds.length === 0
        ? []
        : await this.prisma.candidate.findMany({
            where: { id: { in: allTransferredIds } },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              currentStatus: { select: { statusName: true } },
            },
          });
    const candidateSnapshotById = new Map(
      candidateSnapshotRows.map((row) => [
        row.id,
        {
          name: `${row.firstName} ${row.lastName}`.trim() || 'Unknown candidate',
          statusName: row.currentStatus?.statusName ?? 'Unknown',
        },
      ]),
    );

    await this.prisma.$transaction(async (tx) => {
      for (const assignment of resolvedAssignments) {
        for (const candidateId of assignment.candidateIds) {
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
              recruiterId: assignment.peer.id,
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

      for (const destCode of destinationCodes) {
        const existingDestination = await tx.userCountryCoverage.findUnique({
          where: {
            userId_countryCode: {
              userId,
              countryCode: destCode,
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
              countryCode: destCode,
              sectorScopes,
            },
          });
        }
      }

      await tx.countryCoverageTransfer.create({
        data: {
          sourceUserId: userId,
          transferredById: actorUserId,
          sourceCountryCode: sourceKey,
          sourceCountryCodes: sourceCodes,
          destinationCountryCode: destinationCode,
          destinationCountryCodes: destinationCodes,
          candidateCount: allTransferredIds.length,
          transferMode,
          reason,
          candidates: {
            create: resolvedAssignments.flatMap((assignment) =>
              assignment.candidateIds.map((candidateId) => {
                const snapshot = candidateSnapshotById.get(candidateId);
                return {
                  candidateId,
                  candidateNameSnapshot:
                    snapshot?.name ?? 'Unknown candidate',
                  fromRecruiterId: userId,
                  toRecruiterId: assignment.peer.id,
                  fromRecruiterNameSnapshot: sourceUser.name,
                  toRecruiterNameSnapshot: assignment.peer.name,
                  statusNameSnapshot: snapshot?.statusName ?? 'Unknown',
                };
              }),
            ),
          },
        },
      });
    });

    const assignmentSummaries = resolvedAssignments.map((a) => ({
      targetRecruiterId: a.peer.id,
      targetRecruiterName: a.peer.name,
      candidateIds: a.candidateIds,
      transferredCandidateCount: a.candidateIds.length,
    }));

    await this.auditService.logUserAction(
      'update',
      actorUserId,
      userId,
      {
        sourceCountryCode: sourceKey,
        sourceCountryCodes: sourceCodes,
        destinationCountryCode: destinationCode,
        destinationCountryCodes: destinationCodes,
        assignments: assignmentSummaries,
        candidateIds: allTransferredIds,
        reason,
      },
      { action: 'recruiter_country_coverage_transferred' },
    );

    await this.outboxService.publishRecruiterCountryCoverageTransferred({
      sourceUserId: userId,
      sourceUserName: sourceUser.name,
      targets: assignmentSummaries.map((a) => ({
        targetRecruiterId: a.targetRecruiterId,
        targetRecruiterName: a.targetRecruiterName,
        candidateIds: a.candidateIds,
        candidateCount: a.transferredCandidateCount,
      })),
      // Backward-compatible singular fields (first peer, or null).
      targetRecruiterId: assignmentSummaries[0]?.targetRecruiterId ?? null,
      targetRecruiterName: assignmentSummaries[0]?.targetRecruiterName ?? null,
      transferredBy: actorUserId,
      sourceCountryCode: sourceKey,
      sourceCountryCodes: sourceCodes,
      destinationCountryCode: destinationCode,
      destinationCountryName: destination.name,
      candidateIds: allTransferredIds,
      candidateCount: allTransferredIds.length,
      reason,
    });

    return {
      success: true,
      data: {
        sourceUserId: userId,
        destinationCountryCode: destinationCode,
        destinationCountryName: destination.name,
        destinationCountryCodes: destinationCodes,
        assignments: assignmentSummaries.map((a) => ({
          targetRecruiterId: a.targetRecruiterId,
          targetRecruiterName: a.targetRecruiterName,
          transferredCandidateCount: a.transferredCandidateCount,
        })),
        transferredCandidateCount: allTransferredIds.length,
        removedCountryCodes: sourceCodes,
      },
      message: `Transferred coverage for ${sourceUser.name} to ${destination.name}`,
    };
  }

  private transferHistoryWhereForCountry(countryCode: string) {
    const key = countryCode.trim().toUpperCase();
    const relatedCodes = this.resolveSourceCountryCodes(key);
    return {
      key,
      where: {
        OR: [
          { sourceCountryCode: key },
          { destinationCountryCode: key },
          { sourceCountryCodes: { hasSome: relatedCodes } },
          { destinationCountryCodes: { hasSome: relatedCodes } },
        ],
      },
    };
  }

  async getTransferHistory(
    countryCode: string,
    query: QueryTransferHistoryDto,
  ) {
    const { where } = this.transferHistoryWhereForCountry(countryCode);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [total, rows] = await Promise.all([
      this.prisma.countryCoverageTransfer.count({ where }),
      this.prisma.countryCoverageTransfer.findMany({
        where,
        include: {
          sourceUser: { select: { id: true, name: true } },
          transferredBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      success: true,
      data: {
        items: rows.map((row) => ({
          id: row.id,
          createdAt: row.createdAt,
          reason: row.reason,
          transferMode: row.transferMode,
          candidateCount: row.candidateCount,
          sourceUser: row.sourceUser,
          transferredBy: row.transferredBy,
          sourceCountryCode: row.sourceCountryCode,
          sourceCountryCodes: row.sourceCountryCodes,
          destinationCountryCode: row.destinationCountryCode,
          destinationCountryCodes: row.destinationCountryCodes,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
      message: 'Transfer history retrieved successfully',
    };
  }

  async getTransferHistoryCandidates(
    countryCode: string,
    transferId: string,
    query: QueryTransferHistoryDto,
  ) {
    const { where } = this.transferHistoryWhereForCountry(countryCode);
    const transfer = await this.prisma.countryCoverageTransfer.findFirst({
      where: { id: transferId, ...where },
      select: { id: true, createdAt: true, candidateCount: true },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer history record not found');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [total, rows] = await Promise.all([
      this.prisma.countryCoverageTransferCandidate.count({
        where: { transferId },
      }),
      this.prisma.countryCoverageTransferCandidate.findMany({
        where: { transferId },
        orderBy: { candidateNameSnapshot: 'asc' },
        skip,
        take: limit,
        select: {
          candidateId: true,
          candidateNameSnapshot: true,
          statusNameSnapshot: true,
          fromRecruiterId: true,
          toRecruiterId: true,
          fromRecruiterNameSnapshot: true,
          toRecruiterNameSnapshot: true,
        },
      }),
    ]);

    return {
      success: true,
      data: {
        transferId: transfer.id,
        createdAt: transfer.createdAt,
        candidateCount: transfer.candidateCount,
        items: rows.map((c) => ({
          candidateId: c.candidateId,
          candidateName: c.candidateNameSnapshot,
          statusName: c.statusNameSnapshot,
          fromRecruiter: {
            id: c.fromRecruiterId,
            name: c.fromRecruiterNameSnapshot,
          },
          toRecruiter: {
            id: c.toRecruiterId,
            name: c.toRecruiterNameSnapshot,
          },
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / Math.max(limit, 1))),
        },
      },
      message: 'Transfer history candidates retrieved successfully',
    };
  }

  /** Partition ids evenly across peer ids (sorted). Remainder goes to earliest peers. */
  private partitionEvenly(
    ids: string[],
    peerIds: string[],
  ): Map<string, string[]> {
    const sortedPeers = [...peerIds].sort((a, b) => a.localeCompare(b));
    const buckets = new Map<string, string[]>(
      sortedPeers.map((id) => [id, []]),
    );
    if (sortedPeers.length === 0 || ids.length === 0) {
      return buckets;
    }

    const n = ids.length;
    const k = sortedPeers.length;
    const base = Math.floor(n / k);
    let remainder = n % k;
    let offset = 0;

    for (const peerId of sortedPeers) {
      const size = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
      buckets.set(peerId, ids.slice(offset, offset + size));
      offset += size;
    }

    return buckets;
  }

  /**
   * Assign each candidate to peers who handle their professionTypeId.
   * Within a profession group, even-split across matching peers.
   */
  private peerCoversProfession(
    peer: PeerRef,
    profession: {
      professionTypeId: string | null;
      sector?: ProfessionSector | null;
    },
  ): boolean {
    return recruiterCoversProfession(
      {
        handlesAllProfessions: peer.handlesAllProfessions,
        recruiterSectorScope: peer.recruiterSectorScope,
        professionTypeIds: peer.professionTypeIds,
      },
      {
        id: profession.professionTypeId,
        sector: profession.sector ?? null,
      },
    );
  }

  private partitionByProfessionMatch(
    candidates: Array<{
      id: string;
      name: string;
      professionTypeId: string | null;
      professionLabel: string;
      sector?: ProfessionSector | null;
    }>,
    peers: PeerRef[],
  ): Map<string, string[]> {
    const buckets = new Map<string, string[]>(peers.map((p) => [p.id, []]));
    const unmatched: Array<{ name: string; professionLabel: string }> = [];
    const byProfession = new Map<
      string,
      {
        professionTypeId: string | null;
        sector: ProfessionSector | null;
        group: Array<{ id: string; name: string; professionLabel: string }>;
      }
    >();

    for (const candidate of candidates) {
      const matchingPeerIds = peers
        .filter((p) => this.peerCoversProfession(p, candidate))
        .map((p) => p.id);
      if (matchingPeerIds.length === 0) {
        unmatched.push({
          name: candidate.name,
          professionLabel: candidate.professionLabel,
        });
        continue;
      }
      const groupKey = professionPartitionKey(
        candidate.professionTypeId,
        candidate.sector,
      );
      const existingGroup = byProfession.get(groupKey);
      if (existingGroup) {
        existingGroup.group.push({
          id: candidate.id,
          name: candidate.name,
          professionLabel: candidate.professionLabel,
        });
      } else {
        byProfession.set(groupKey, {
          professionTypeId: candidate.professionTypeId,
          sector: candidate.sector ?? null,
          group: [
            {
              id: candidate.id,
              name: candidate.name,
              professionLabel: candidate.professionLabel,
            },
          ],
        });
      }
    }

    if (unmatched.length > 0) {
      const sample = unmatched
        .slice(0, 5)
        .map((c) => `${c.name} (${c.professionLabel})`)
        .join(', ');
      const more =
        unmatched.length > 5 ? ` and ${unmatched.length - 5} more` : '';
      throw new BadRequestException(
        `${unmatched.length} candidate(s) have no selected peer for their profession: ${sample}${more}`,
      );
    }

    for (const { professionTypeId, sector, group } of byProfession.values()) {
      const matchingPeerIds = peers
        .filter((p) =>
          this.peerCoversProfession(p, { professionTypeId, sector }),
        )
        .map((p) => p.id);
      const ids = group.map((c) => c.id);
      const split = this.partitionEvenly(ids, matchingPeerIds);
      for (const [peerId, candidateIds] of split) {
        const existing = buckets.get(peerId) ?? [];
        existing.push(...candidateIds);
        buckets.set(peerId, existing);
      }
    }

    return buckets;
  }

  private mapProfessionScopes(
    scopes: Array<{
      professionType: {
        id: string;
        label: string;
        sector: ProfessionSector | null;
      };
    }>,
  ): {
    professionScopes: TransferProfessionScope[];
    sectorScopes: ProfessionSector[];
    professionTypeIds: Set<string>;
  } {
    const professionScopes = (scopes ?? []).map((s) => ({
      id: s.professionType.id,
      label: s.professionType.label,
      sector: s.professionType.sector,
    }));
    const sectorSet = new Set<ProfessionSector>();
    for (const scope of professionScopes) {
      if (scope.sector) sectorSet.add(scope.sector);
    }
    return {
      professionScopes,
      sectorScopes: Array.from(sectorSet).sort(),
      professionTypeIds: new Set(professionScopes.map((s) => s.id)),
    };
  }

  private sectorScopesForPeer(
    handlesAllProfessions: boolean,
    recruiterSectorScope: RecruiterProfessionScope | null,
    fromProfessions: ProfessionSector[],
  ): ProfessionSector[] {
    if (handlesAllProfessions && recruiterSectorScope) {
      if (recruiterSectorScope === RecruiterProfessionScope.BOTH) {
        return [ProfessionSector.HEALTHCARE, ProfessionSector.NON_HEALTH_CARE];
      }
      return recruiterSectorScope === RecruiterProfessionScope.HEALTHCARE
        ? [ProfessionSector.HEALTHCARE]
        : [ProfessionSector.NON_HEALTH_CARE];
    }
    return fromProfessions;
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

  private async findPositiveCandidateProfessionsForRecruiter(
    recruiterId: string,
  ): Promise<PositiveCandidateProfession[]> {
    const rows = await this.prisma.candidate.findMany({
      where: this.positiveCandidateWhere(recruiterId),
      select: {
        id: true,
        professionTypeId: true,
        focusesAllProfessions: true,
        professionSector: true,
        professionType: { select: { label: true, sector: true } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    return (rows ?? []).map((row) => this.mapPositiveCandidateProfession(row));
  }

  private async findPositiveCandidatesWithProfessionForRecruiter(
    recruiterId: string,
  ): Promise<
    Array<{
      id: string;
      name: string;
      professionTypeId: string | null;
      professionLabel: string;
      sector: ProfessionSector | null;
    }>
  > {
    const rows = await this.prisma.candidate.findMany({
      where: this.positiveCandidateWhere(recruiterId),
      select: {
        id: true,
        firstName: true,
        lastName: true,
        professionTypeId: true,
        focusesAllProfessions: true,
        professionSector: true,
        professionType: { select: { label: true, sector: true } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    return (rows ?? []).map((row) => {
      const mapped = this.mapPositiveCandidateProfession(row);
      return {
        ...mapped,
        name: `${row.firstName} ${row.lastName}`.trim() || 'Unknown candidate',
      };
    });
  }

  private async findPositiveCandidatesForRecruiter(
    recruiterId: string,
    opts: { page: number; limit: number },
  ): Promise<{
    items: TransferPreviewCandidate[];
    total: number;
  }> {
    const where = this.positiveCandidateWhere(recruiterId);
    const skip = (opts.page - 1) * opts.limit;

    const [total, rows] = await Promise.all([
      this.prisma.candidate.count({ where }),
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
          professionTypeId: true,
          focusesAllProfessions: true,
          professionSector: true,
          currentStatus: { select: { statusName: true } },
          professionType: { select: { label: true, sector: true } },
        },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        skip,
        take: opts.limit,
      }),
    ]);

    return {
      total,
      items: rows.map((row) => {
        const mapped = this.mapPositiveCandidateProfession(row);
        return {
          id: row.id,
          firstName: row.firstName,
          lastName: row.lastName,
          name: `${row.firstName} ${row.lastName}`.trim(),
          email: row.email ?? null,
          mobileNumber: row.mobileNumber ?? null,
          phoneCountryCode: row.countryCode ?? null,
          profileImage: row.profileImage ?? null,
          statusName: row.currentStatus?.statusName ?? 'Unknown',
          professionTypeId: mapped.professionTypeId,
          professionLabel: mapped.professionLabel,
          sector: mapped.sector,
        };
      }),
    };
  }

  private mapPositiveCandidateProfession(row: {
    id: string;
    professionTypeId: string | null;
    focusesAllProfessions?: boolean;
    professionSector?: ProfessionSector | null;
    professionType?: { label: string; sector: ProfessionSector | null } | null;
  }): PositiveCandidateProfession {
    const sector = row.professionType?.sector ?? row.professionSector ?? null;
    return {
      id: row.id,
      professionTypeId: row.professionTypeId,
      professionLabel:
        row.professionType?.label ??
        (row.focusesAllProfessions
          ? anyProfessionFocusLabel(sector)
          : 'Unknown'),
      sector,
    };
  }

  private async findPeerRecruiterById(
    excludeUserId: string,
    sourceCodes: string[],
    peerUserId: string,
  ): Promise<PeerRef | null> {
    const coverage = await this.prisma.userCountryCoverage.findFirst({
      where: {
        countryCode: { in: sourceCodes },
        userId: peerUserId,
        user: {
          id: { not: excludeUserId },
          accountStatus: UserAccountStatus.ACTIVE,
          userRoles: {
            some: {
              role: { name: { in: roleNameAliases(ROLE_NAMES.RECRUITER) } },
            },
          },
        },
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            handlesAllProfessions: true,
            recruiterSectorScope: true,
            userProfessionScopes: {
              select: {
                professionType: {
                  select: { id: true, label: true, sector: true },
                },
              },
            },
          },
        },
      },
    });

    if (!coverage?.user) return null;
    const mapped = this.mapProfessionScopes(
      coverage.user.userProfessionScopes,
    );
    return {
      id: coverage.user.id,
      name: coverage.user.name,
      email: coverage.user.email,
      professionTypeIds: mapped.professionTypeIds,
      handlesAllProfessions: coverage.user.handlesAllProfessions ?? false,
      recruiterSectorScope: coverage.user.recruiterSectorScope ?? null,
    };
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
        some: { role: { name: string | { in: string[] } } };
      };
      OR?: Array<
        | { name: { contains: string; mode: 'insensitive' } }
        | { email: { contains: string; mode: 'insensitive' } }
      >;
    } = {
      accountStatus: UserAccountStatus.ACTIVE,
      userRoles: {
        some: {
          role: { name: { in: roleNameAliases(ROLE_NAMES.RECRUITER) } },
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
            mobileNumber: true,
            countryCode: true,
            profileImage: true,
            handlesAllProfessions: true,
            recruiterSectorScope: true,
            userProfessionScopes: {
              select: {
                professionType: {
                  select: { id: true, label: true, sector: true },
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
      Omit<TransferPreviewPeer, 'positiveCandidateCount'>
    >();
    for (const row of rows) {
      const existing = byUser.get(row.user.id);
      if (existing) {
        if (!existing.coveredCountryCodes.includes(row.countryCode)) {
          existing.coveredCountryCodes.push(row.countryCode);
        }
      } else {
        const mapped = this.mapProfessionScopes(row.user.userProfessionScopes);
        byUser.set(row.user.id, {
          id: row.user.id,
          name: row.user.name,
          email: row.user.email,
          mobileNumber: row.user.mobileNumber ?? null,
          phoneCountryCode: row.user.countryCode ?? null,
          profileImage: row.user.profileImage ?? null,
          coveredCountryCodes: [row.countryCode],
          professionScopes: mapped.professionScopes,
          sectorScopes: this.sectorScopesForPeer(
            row.user.handlesAllProfessions ?? false,
            row.user.recruiterSectorScope ?? null,
            mapped.sectorScopes,
          ),
          handlesAllProfessions: row.user.handlesAllProfessions ?? false,
          recruiterSectorScope: row.user.recruiterSectorScope ?? null,
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
    const pagePeers = allPeers.slice(skip, skip + opts.limit);
    const positiveCounts = await this.countPositiveCandidatesForRecruiters(
      pagePeers.map((p) => p.id),
    );

    const items: TransferPreviewPeer[] = pagePeers.map((peer) => ({
      ...peer,
      positiveCandidateCount: positiveCounts.get(peer.id) ?? 0,
    }));

    return { items, total };
  }

  /** Batch positive CRM counts for a page of peer recruiters (same statuses as handoff). */
  private async countPositiveCandidatesForRecruiters(
    recruiterIds: string[],
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (recruiterIds.length === 0) {
      return counts;
    }

    await Promise.all(
      recruiterIds.map(async (recruiterId) => {
        const total = await this.prisma.candidate.count({
          where: this.positiveCandidateWhere(recruiterId),
        });
        counts.set(recruiterId, total);
      }),
    );

    return counts;
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
