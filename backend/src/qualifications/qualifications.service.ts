import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { QueryQualificationsDto } from './dto/query-qualifications.dto';

@Injectable()
export class QualificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(queryDto: QueryQualificationsDto) {
    const {
      q,
      level,
      field,
      countryCode,
      isActive,
      page,
      limit,
      sortBy,
      sortOrder,
    } = queryDto;

    // Build where clause
    const where: any = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { shortName: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { field: { contains: q, mode: 'insensitive' } },
        { aliases: { some: { alias: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    if (level) {
      where.level = level;
    }

    if (field) {
      where.field = { contains: field, mode: 'insensitive' };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Calculate pagination
    const skip = ((page || 1) - 1) * (limit || 20);

    // Build orderBy
    const orderBy: any = {};
    orderBy[sortBy || 'name'] = sortOrder || 'asc';

    // Execute queries
    const [qualifications, total] = await Promise.all([
      this.prisma.qualification.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          shortName: true,
          level: true,
          field: true,
          program: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          aliases: {
            where: { isCommon: true },
            select: {
              alias: true,
              isCommon: true,
            },
          },
          ...(countryCode && {
            countryProfiles: {
              where: { countryCode },
              select: {
                regulatedTitle: true,
                issuingBody: true,
                accreditationStatus: true,
                notes: true,
              },
            },
          }),
        },
      }),
      this.prisma.qualification.count({ where }),
    ]);

    return {
      qualifications,
      pagination: {
        page: page || 1,
        limit: limit || 20,
        total,
        totalPages: Math.ceil(total / (limit || 20)),
      },
    };
  }

  async findOne(id: string) {
    return this.prisma.qualification.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        shortName: true,
        level: true,
        field: true,
        program: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        aliases: {
          select: {
            alias: true,
            isCommon: true,
          },
        },
        countryProfiles: {
          select: {
            countryCode: true,
            regulatedTitle: true,
            issuingBody: true,
            accreditationStatus: true,
            notes: true,
            country: {
              select: {
                name: true,
              },
            },
          },
        },
        equivalencies: {
          select: {
            toQualification: {
              select: {
                id: true,
                name: true,
                shortName: true,
                level: true,
                field: true,
              },
            },
            countryCode: true,
            isEquivalent: true,
            notes: true,
          },
        },
      },
    });
  }

  async validateQualificationId(qualificationId: string): Promise<boolean> {
    const qualification = await this.prisma.qualification.findFirst({
      where: { id: qualificationId, isActive: true },
      select: { id: true },
    });
    return !!qualification;
  }

  async validateQualificationIds(qualificationIds: string[]): Promise<boolean> {
    const count = await this.prisma.qualification.count({
      where: {
        id: { in: qualificationIds },
        isActive: true,
      },
    });
    return count === qualificationIds.length;
  }

  async getQualificationsByIds(qualificationIds: string[]) {
    return this.prisma.qualification.findMany({
      where: {
        id: { in: qualificationIds },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        shortName: true,
        level: true,
        field: true,
        program: true,
        description: true,
      },
    });
  }
}
