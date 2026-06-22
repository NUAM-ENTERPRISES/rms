import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  CountryRestrictionType,
  ProcessingStepCancelSourceMeta,
} from '../common/constants/country-restriction-types';
import {
  ActiveCountryRestriction,
  assertCandidateNotRestrictedForCountry,
  findActiveCountryRestriction,
} from './utils/country-restriction-guard';

export interface ApplyCountryRestrictionInput {
  candidateId: string;
  countryCode: string;
  restrictionType: CountryRestrictionType;
  reason: string;
  sourceMeta?: Prisma.InputJsonValue;
  restrictedById: string;
  statusChangeRequestId?: string;
}

@Injectable()
export class CandidateCountryRestrictionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findRestrictions(
    candidateId: string,
    options: {
      includeInactive?: boolean;
      page?: number;
      limit?: number;
      countryCode?: string;
    } = {},
  ) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { id: true },
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    const includeInactive = options.includeInactive ?? false;
    const page = options.page ?? 1;
    const limit = options.limit ?? 5;
    const skip = (page - 1) * limit;

    const where: Prisma.CandidateCountryRestrictionWhereInput = {
      candidateId,
      ...(includeInactive ? {} : { isActive: true }),
      ...(options.countryCode
        ? { countryCode: options.countryCode.trim().toUpperCase() }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.candidateCountryRestriction.count({ where }),
      this.prisma.candidateCountryRestriction.findMany({
        where,
        include: {
          country: { select: { code: true, name: true } },
          restrictedBy: { select: { id: true, name: true } },
          liftedBy: { select: { id: true, name: true } },
        },
        orderBy: [{ isActive: 'desc' }, { restrictedAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findActiveRestrictions(candidateId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { id: true },
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    return this.prisma.candidateCountryRestriction.findMany({
      where: {
        candidateId,
        isActive: true,
      },
      include: {
        country: { select: { code: true, name: true } },
        restrictedBy: { select: { id: true, name: true } },
        liftedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ restrictedAt: 'desc' }],
    });
  }

  async applyRestriction(input: ApplyCountryRestrictionInput) {
    const {
      candidateId,
      countryCode,
      restrictionType,
      reason,
      sourceMeta,
      restrictedById,
      statusChangeRequestId,
    } = input;

    const country = await this.prisma.country.findUnique({
      where: { code: countryCode },
    });
    if (!country) {
      throw new BadRequestException(`Country code ${countryCode} is not valid`);
    }

    const existingActive = await findActiveCountryRestriction(
      this.prisma,
      candidateId,
      countryCode,
    );

    if (existingActive) {
      return this.prisma.candidateCountryRestriction.update({
        where: { id: existingActive.id },
        data: {
          restrictionType,
          reason,
          sourceMeta: sourceMeta ?? existingActive.sourceMeta ?? Prisma.JsonNull,
          statusChangeRequestId: statusChangeRequestId ?? existingActive.statusChangeRequestId,
          restrictedById,
          restrictedAt: new Date(),
        },
        include: {
          country: { select: { code: true, name: true } },
          restrictedBy: { select: { id: true, name: true } },
        },
      });
    }

    return this.prisma.candidateCountryRestriction.create({
      data: {
        candidateId,
        countryCode,
        restrictionType,
        reason,
        sourceMeta: sourceMeta ?? Prisma.JsonNull,
        statusChangeRequestId,
        restrictedById,
      },
      include: {
        country: { select: { code: true, name: true } },
        restrictedBy: { select: { id: true, name: true } },
      },
    });
  }

  async liftRestriction(
    candidateId: string,
    countryCode: string,
    userId: string,
    reason: string,
  ) {
    const restriction = await findActiveCountryRestriction(
      this.prisma,
      candidateId,
      countryCode,
    );

    if (!restriction) {
      throw new NotFoundException(
        `No active country restriction found for candidate ${candidateId} and country ${countryCode}`,
      );
    }

    return this.prisma.candidateCountryRestriction.update({
      where: { id: restriction.id },
      data: {
        isActive: false,
        liftedAt: new Date(),
        liftedById: userId,
        liftReason: reason,
      },
      include: {
        country: { select: { code: true, name: true } },
        liftedBy: { select: { id: true, name: true } },
      },
    });
  }

  async liftRestrictionIfActive(
    candidateId: string,
    countryCode: string,
    userId: string,
    reason: string,
  ) {
    const restriction = await findActiveCountryRestriction(
      this.prisma,
      candidateId,
      countryCode,
    );

    if (!restriction) {
      return null;
    }

    return this.liftRestriction(candidateId, countryCode, userId, reason);
  }

  async assertNotRestricted(
    candidateId: string,
    projectCountryCode: string | null | undefined,
  ): Promise<void> {
    await assertCandidateNotRestrictedForCountry(
      this.prisma,
      candidateId,
      projectCountryCode,
    );
  }

  async getActiveRestrictionForCountry(
    candidateId: string,
    countryCode: string | null | undefined,
  ): Promise<ActiveCountryRestriction | null> {
    if (!countryCode) {
      return null;
    }
    return findActiveCountryRestriction(this.prisma, candidateId, countryCode);
  }

  buildProcessingStepCancelSourceMeta(params: {
    stepKey: string;
    projectId: string;
    projectTitle?: string;
    processingStepId?: string;
    processingCandidateId?: string;
  }): ProcessingStepCancelSourceMeta {
    return { ...params };
  }
}
