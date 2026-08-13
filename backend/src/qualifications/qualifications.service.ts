import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, QualificationLevel } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { QueryQualificationsDto } from './dto/query-qualifications.dto';
import { QueryAdminQualificationsDto } from './dto/query-admin-qualifications.dto';
import { CreateQualificationDto } from './dto/create-qualification.dto';
import { UpdateQualificationDto } from './dto/update-qualification.dto';

const qualificationAdminSelect = {
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
    orderBy: { alias: 'asc' as const },
  },
} satisfies Prisma.QualificationSelect;

type AliasInput = { alias: string; isCommon?: boolean };

function dedupeAliases(aliases: AliasInput[]): AliasInput[] {
  const seen = new Set<string>();
  const result: AliasInput[] = [];
  for (const item of aliases) {
    const alias = item.alias.trim();
    if (!alias) continue;
    const key = alias.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ alias, isCommon: item.isCommon ?? false });
  }
  return result;
}

@Injectable()
export class QualificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

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

    const where: Prisma.QualificationWhereInput = {};

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
      where.level = level as QualificationLevel;
    }

    if (field) {
      where.field = { contains: field, mode: 'insensitive' };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const skip = ((page || 1) - 1) * (limit || 20);
    const orderBy: Prisma.QualificationOrderByWithRelationInput = {
      [sortBy || 'name']: sortOrder || 'asc',
    };

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

  async findAllForAdmin(filters: QueryAdminQualificationsDto = {}) {
    const q = filters.q?.trim();
    const where: Prisma.QualificationWhereInput = {
      ...(filters.level ? { level: filters.level as QualificationLevel } : {}),
      ...(filters.field
        ? { field: { contains: filters.field, mode: 'insensitive' } }
        : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { shortName: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              { field: { contains: q, mode: 'insensitive' } },
              {
                aliases: {
                  some: { alias: { contains: q, mode: 'insensitive' } },
                },
              },
            ],
          }
        : {}),
    };

    const qualifications = await this.prisma.qualification.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      select: qualificationAdminSelect,
    });

    return { qualifications };
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

  async create(dto: CreateQualificationDto) {
    const aliases = dto.aliases ? dedupeAliases(dto.aliases) : [];

    try {
      return await this.prisma.qualification.create({
        data: {
          name: dto.name,
          shortName: dto.shortName,
          level: dto.level as QualificationLevel,
          field: dto.field,
          program: dto.program,
          description: dto.description,
          isActive: dto.isActive ?? true,
          aliases:
            aliases.length > 0
              ? {
                  create: aliases.map((alias) => ({
                    alias: alias.alias,
                    isCommon: alias.isCommon ?? false,
                  })),
                }
              : undefined,
        },
        select: qualificationAdminSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Qualification with name "${dto.name}" already exists`,
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateQualificationDto) {
    await this.assertExists(id);

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.aliases !== undefined) {
          const aliases = dedupeAliases(dto.aliases);
          await tx.qualificationAlias.deleteMany({
            where: { qualificationId: id },
          });
          if (aliases.length > 0) {
            await tx.qualificationAlias.createMany({
              data: aliases.map((alias) => ({
                qualificationId: id,
                alias: alias.alias,
                isCommon: alias.isCommon ?? false,
              })),
            });
          }
        }

        return tx.qualification.update({
          where: { id },
          data: {
            ...(dto.name !== undefined ? { name: dto.name } : {}),
            ...(dto.shortName !== undefined ? { shortName: dto.shortName } : {}),
            ...(dto.level !== undefined
              ? { level: dto.level as QualificationLevel }
              : {}),
            ...(dto.field !== undefined ? { field: dto.field } : {}),
            ...(dto.program !== undefined ? { program: dto.program } : {}),
            ...(dto.description !== undefined
              ? { description: dto.description }
              : {}),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          },
          select: qualificationAdminSelect,
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Qualification with name "${dto.name}" already exists`,
        );
      }
      throw error;
    }
  }

  async softDelete(id: string, actorId: string) {
    const existing = await this.prisma.qualification.findUnique({
      where: { id },
      select: qualificationAdminSelect,
    });
    if (!existing) {
      throw new NotFoundException(`Qualification ${id} not found`);
    }
    if (!existing.isActive) {
      throw new BadRequestException(
        `Qualification "${existing.name}" is already inactive`,
      );
    }

    const updated = await this.prisma.qualification.update({
      where: { id },
      data: { isActive: false },
      select: qualificationAdminSelect,
    });

    await this.auditService.log({
      actionType: 'delete',
      entityId: id,
      entityType: 'qualification',
      userId: actorId,
      changes: {
        softDelete: true,
        previous: { isActive: true },
        current: { isActive: false },
        name: existing.name,
        shortName: existing.shortName,
        level: existing.level,
        field: existing.field,
      },
    });

    return updated;
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

  private async assertExists(id: string) {
    const existing = await this.prisma.qualification.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(`Qualification ${id} not found`);
    }
  }
}
