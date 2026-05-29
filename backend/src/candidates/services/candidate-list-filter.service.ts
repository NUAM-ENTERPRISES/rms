import { Injectable } from '@nestjs/common';
import { Gender, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { QueryCandidatesDto } from '../dto/query-candidates.dto';
import { DateFilterType } from '../dto/query-candidates.dto';

@Injectable()
export class CandidateListFilterService {
  constructor(private readonly prisma: PrismaService) {}

  applySearchFilter(
    where: Prisma.CandidateWhereInput,
    search?: string,
    options?: { includeQualifications?: boolean },
  ): void {
    if (!search?.trim()) return;

    const s = search.trim();
    const baseOr: Prisma.CandidateWhereInput[] = [
      { firstName: { contains: s, mode: 'insensitive' } },
      { lastName: { contains: s, mode: 'insensitive' } },
      { candidateCode: { contains: s, mode: 'insensitive' } },
      { mobileNumber: { contains: s, mode: 'insensitive' } },
      { email: { contains: s, mode: 'insensitive' } },
    ];

    if (options?.includeQualifications) {
      baseOr.push({
        qualifications: {
          some: {
            OR: [
              { qualification: { name: { contains: s, mode: 'insensitive' } } },
              { qualification: { shortName: { contains: s, mode: 'insensitive' } } },
              { qualification: { field: { contains: s, mode: 'insensitive' } } },
              { university: { contains: s, mode: 'insensitive' } },
            ],
          },
        },
      });
    }

    where.OR = baseOr;
  }

  applyCreatedAtFilter(
    where: Prisma.CandidateWhereInput,
    query: Pick<QueryCandidatesDto, 'dateFilter' | 'dateFrom' | 'dateTo'>,
  ): void {
    const { dateFilter, dateFrom, dateTo } = query;

    if (dateFilter && dateFilter !== DateFilterType.CUSTOM && dateFilter !== DateFilterType.ALL) {
      const now = new Date();
      let start: Date | undefined;
      let end: Date | undefined;

      switch (dateFilter) {
        case DateFilterType.TODAY:
          start = new Date(new Date().setHours(0, 0, 0, 0));
          end = new Date(new Date().setHours(23, 59, 59, 999));
          break;
        case DateFilterType.YESTERDAY: {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          start = new Date(yesterday.setHours(0, 0, 0, 0));
          end = new Date(yesterday.setHours(23, 59, 59, 999));
          break;
        }
        case DateFilterType.THIS_WEEK: {
          const first = now.getDate() - now.getDay();
          const sunday = new Date(new Date().setDate(first));
          start = new Date(sunday.setHours(0, 0, 0, 0));
          end = new Date();
          end.setHours(23, 59, 59, 999);
          break;
        }
        case DateFilterType.LAST_WEEK: {
          const lastFirst = now.getDate() - now.getDay() - 7;
          const lastSunday = new Date(new Date().setDate(lastFirst));
          start = new Date(lastSunday.setHours(0, 0, 0, 0));
          end = new Date(start);
          end.setDate(start.getDate() + 6);
          end.setHours(23, 59, 59, 999);
          break;
        }
        case DateFilterType.THIS_MONTH:
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date();
          end.setHours(23, 59, 59, 999);
          break;
        case DateFilterType.THIS_YEAR:
          start = new Date(now.getFullYear(), 0, 1);
          end = new Date();
          end.setHours(23, 59, 59, 999);
          break;
      }

      if (start && end) {
        where.createdAt = { gte: start, lte: end };
      }
      return;
    }

    if (dateFrom || dateTo) {
      let fromDt: Date | undefined;
      let toDt: Date | undefined;

      if (dateFrom) {
        const parsed = new Date(dateFrom);
        fromDt = new Date(
          Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0, 0),
        );
      }

      if (dateTo) {
        const parsed = new Date(dateTo);
        toDt = new Date(
          Date.UTC(
            parsed.getUTCFullYear(),
            parsed.getUTCMonth(),
            parsed.getUTCDate(),
            23,
            59,
            59,
            999,
          ),
        );
      }

      if (fromDt && toDt && fromDt.getTime() > toDt.getTime()) {
        const tmp = fromDt;
        fromDt = toDt;
        toDt = tmp;
      }

      where.createdAt = {};
      if (fromDt) {
        (where.createdAt as Prisma.DateTimeFilter).gte = fromDt;
      }
      if (toDt) {
        (where.createdAt as Prisma.DateTimeFilter).lte = toDt;
      }
    }
  }

  applySourceFilter(
    where: Prisma.CandidateWhereInput,
    query: Pick<QueryCandidatesDto, 'source' | 'sources'>,
    agentChannelWhere?: Prisma.CandidateWhereInput,
  ): void {
    if (query.sources && query.sources.length > 0) {
      const onlyAgent =
        query.sources.length === 1 && query.sources[0] === 'agent' && agentChannelWhere;
      if (onlyAgent) {
        where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), agentChannelWhere];
        return;
      }
      where.source = { in: query.sources };
      return;
    }

    if (!query.source || query.source === 'all') return;

    if (query.source === 'agent' && agentChannelWhere) {
      where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), agentChannelWhere];
      return;
    }

    where.source = query.source;
  }

  applyAdvancedListFilters(
    where: Prisma.CandidateWhereInput,
    query: QueryCandidatesDto,
    options?: { skipSource?: boolean },
  ): void {
    const {
      gender,
      agentId,
      teamId,
      minExperience,
      maxExperience,
      minSalary,
      maxSalary,
      visaType,
      qualification,
      heightMin,
      heightMax,
      weightMin,
      weightMax,
      skinTone,
      languageProficiency,
      smartness,
      licensingExam,
      dataFlow,
      eligibility,
      minAge,
      maxAge,
      dateOfBirthFrom,
      dateOfBirthTo,
      workExperienceCompany,
      workExperienceTitle,
      roleCatalogId,
      countryPreferences,
      sectorTypes,
      facilityPreferences,
    } = query;

    if (!options?.skipSource) {
      this.applySourceFilter(where, query);
    }

    if (gender) {
      const normalized =
        typeof gender === 'string' ? gender.toUpperCase() : String(gender);
      where.gender = normalized as Gender;
    }

    if (agentId) {
      where.agentId = agentId;
    }

    if (teamId) {
      where.teamId = teamId;
    }

    if (countryPreferences && countryPreferences.length > 0) {
      where.preferredCountries = {
        some: { countryCode: { in: countryPreferences } },
      };
    }

    if (sectorTypes && sectorTypes.length > 0) {
      where.sectorType = { in: sectorTypes };
    }

    if (facilityPreferences && facilityPreferences.length > 0) {
      where.facilityPreferences = {
        some: { facilityType: { in: facilityPreferences } },
      };
    }

    if (visaType) {
      where.visaType = visaType;
    }

    if (qualification) {
      where.qualifications = {
        some: {
          qualification: {
            name: { contains: qualification, mode: 'insensitive' },
          },
        },
      };
    }

    if (minExperience !== undefined || maxExperience !== undefined) {
      where.experience = {};
      if (minExperience !== undefined) {
        (where.experience as Prisma.IntFilter).gte = minExperience;
      }
      if (maxExperience !== undefined) {
        (where.experience as Prisma.IntFilter).lte = maxExperience;
      }
    }

    if (minSalary !== undefined || maxSalary !== undefined) {
      where.expectedMinSalary = {};
      if (minSalary !== undefined) {
        (where.expectedMinSalary as Prisma.IntFilter).gte = minSalary;
      }
      if (maxSalary !== undefined) {
        (where.expectedMinSalary as Prisma.IntFilter).lte = maxSalary;
      }
    }

    if (heightMin !== undefined || heightMax !== undefined) {
      where.height = {};
      if (heightMin !== undefined) {
        (where.height as Prisma.IntFilter).gte = heightMin;
      }
      if (heightMax !== undefined) {
        (where.height as Prisma.IntFilter).lte = heightMax;
      }
    }

    if (weightMin !== undefined || weightMax !== undefined) {
      where.weight = {};
      if (weightMin !== undefined) {
        (where.weight as Prisma.IntFilter).gte = weightMin;
      }
      if (weightMax !== undefined) {
        (where.weight as Prisma.IntFilter).lte = weightMax;
      }
    }

    if (skinTone) {
      where.skinTone = skinTone;
    }

    if (languageProficiency) {
      where.languageProficiency = {
        contains: languageProficiency,
        mode: 'insensitive',
      };
    }

    if (smartness) {
      where.smartness = smartness;
    }

    if (licensingExam) {
      where.licensingExam = licensingExam;
    }

    if (dataFlow !== undefined) {
      where.dataFlow = dataFlow;
    }

    if (eligibility !== undefined) {
      where.eligibility = eligibility;
    }

    const ageDobRange = this.computeDateOfBirthRangeFromAge(minAge, maxAge);
    if (ageDobRange.dateOfBirthFrom || ageDobRange.dateOfBirthTo) {
      where.dateOfBirth = {};
      if (ageDobRange.dateOfBirthFrom) {
        (where.dateOfBirth as Prisma.DateTimeFilter).gte = ageDobRange.dateOfBirthFrom;
      }
      if (ageDobRange.dateOfBirthTo) {
        (where.dateOfBirth as Prisma.DateTimeFilter).lte = ageDobRange.dateOfBirthTo;
      }
    }

    if (dateOfBirthFrom || dateOfBirthTo) {
      if (!where.dateOfBirth) {
        where.dateOfBirth = {};
      }
      if (dateOfBirthFrom) {
        const parsedFrom = new Date(dateOfBirthFrom);
        const existingGte = (where.dateOfBirth as Prisma.DateTimeFilter).gte;
        (where.dateOfBirth as Prisma.DateTimeFilter).gte = existingGte
          ? new Date(Math.max(new Date(existingGte as Date).getTime(), parsedFrom.getTime()))
          : parsedFrom;
      }
      if (dateOfBirthTo) {
        const parsedTo = new Date(dateOfBirthTo);
        const toDate = new Date(parsedTo);
        toDate.setHours(23, 59, 59, 999);
        const existingLte = (where.dateOfBirth as Prisma.DateTimeFilter).lte;
        (where.dateOfBirth as Prisma.DateTimeFilter).lte = existingLte
          ? new Date(Math.min(new Date(existingLte as Date).getTime(), toDate.getTime()))
          : toDate;
      }
    }

    if (workExperienceCompany || workExperienceTitle || (roleCatalogId && roleCatalogId !== 'all')) {
      const workExperienceCondition: Prisma.WorkExperienceWhereInput = {};
      if (workExperienceCompany) {
        workExperienceCondition.companyName = {
          contains: workExperienceCompany,
          mode: 'insensitive',
        };
      }
      if (workExperienceTitle) {
        workExperienceCondition.jobTitle = {
          contains: workExperienceTitle,
          mode: 'insensitive',
        };
      }
      if (roleCatalogId && roleCatalogId !== 'all') {
        workExperienceCondition.roleCatalogId = roleCatalogId;
      }
      where.workExperiences = { some: workExperienceCondition };
    }
  }

  async applyCrmStatusNameFilter(
    where: Prisma.CandidateWhereInput,
    status?: string,
    currentStatus?: string,
  ): Promise<void> {
    const effectiveStatus = currentStatus || status;
    if (!effectiveStatus || effectiveStatus === 'all') return;

    const normalized = effectiveStatus.replace(/_/g, ' ').trim();
    const titleCase = normalized
      .split(' ')
      .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ');

    const statusRecord = await this.prisma.candidateStatus.findFirst({
      where: {
        OR: [
          { statusName: { equals: effectiveStatus, mode: 'insensitive' } },
          { statusName: { equals: normalized, mode: 'insensitive' } },
          { statusName: { equals: titleCase, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    if (statusRecord) {
      where.currentStatusId = statusRecord.id;
      return;
    }

    where.currentStatus = {
      statusName: { equals: effectiveStatus, mode: 'insensitive' },
    };
  }

  computeDateOfBirthRangeFromAge(
    minAge?: number,
    maxAge?: number,
  ): { dateOfBirthFrom?: Date; dateOfBirthTo?: Date } {
    if (minAge == null && maxAge == null) return {};

    const now = new Date();
    const range: { dateOfBirthFrom?: Date; dateOfBirthTo?: Date } = {};

    if (maxAge !== undefined && maxAge !== null) {
      const earliest = new Date(now);
      earliest.setFullYear(now.getFullYear() - maxAge);
      earliest.setHours(0, 0, 0, 0);
      range.dateOfBirthFrom = earliest;
    }

    if (minAge !== undefined && minAge !== null) {
      const latest = new Date(now);
      latest.setFullYear(now.getFullYear() - minAge);
      latest.setHours(23, 59, 59, 999);
      range.dateOfBirthTo = latest;
    }

    return range;
  }
}
