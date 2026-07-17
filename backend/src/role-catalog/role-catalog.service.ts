import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { QueryRolesDto } from './dto/query-roles.dto';
import { CreateRoleCatalogDto } from './dto/create-role-catalog.dto';
import { UpdateRoleCatalogDto } from './dto/update-role-catalog.dto';
import { assertActiveRoleDepartment } from '../role-departments/role-departments.service';
import { assertActiveProfessionType } from '../profession-types/profession-types.service';

const professionTypeSelect = {
  id: true,
  name: true,
  label: true,
  sector: true,
} as const;

const roleDepartmentSelect = {
  id: true,
  name: true,
  label: true,
  shortName: true,
} as const;

const roleCatalogSelect = {
  id: true,
  name: true,
  label: true,
  shortName: true,
  description: true,
  roleDepartmentId: true,
  professionTypeId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  roleDepartment: { select: roleDepartmentSelect },
  professionType: { select: professionTypeSelect },
} as const;

@Injectable()
export class RoleCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(queryDto: QueryRolesDto) {
    const {
      q,
      search,
      category,
      professionTypeId,
      sector,
      isClinical,
      roleDepartmentId,
      isActive,
      page,
      limit,
      sortBy,
      sortOrder,
    } = queryDto as QueryRolesDto & { category?: string; isClinical?: boolean };

    const where: Prisma.RoleCatalogWhereInput = {};

    const searchTerm = search || q;
    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { label: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { shortName: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // legacy filters kept for backwards compatibility (no-op on current schema)
    void category;
    void isClinical;

    if (professionTypeId) {
      where.professionTypeId = professionTypeId;
    }

    if (sector) {
      where.professionType = { sector };
    }

    if (roleDepartmentId) {
      where.roleDepartmentId = roleDepartmentId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const skip = ((page || 1) - 1) * (limit || 20);
    const orderBy: Prisma.RoleCatalogOrderByWithRelationInput = {
      [sortBy || 'createdAt']: sortOrder || 'desc',
    };

    const [roles, total] = await Promise.all([
      this.prisma.roleCatalog.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: roleCatalogSelect,
      }),
      this.prisma.roleCatalog.count({ where }),
    ]);

    return {
      roles,
      pagination: {
        page: page || 1,
        limit: limit || 20,
        total,
        totalPages: Math.ceil(total / (limit || 20)),
      },
    };
  }

  async findOne(id: string) {
    return this.prisma.roleCatalog.findUnique({
      where: { id },
      select: {
        ...roleCatalogSelect,
        recommendedQualifications: {
          where: { qualification: { isActive: true } },
          orderBy: [{ weight: 'desc' }, { isPreferred: 'desc' }],
          select: {
            id: true,
            weight: true,
            isPreferred: true,
            notes: true,
            countryCode: true,
            qualification: {
              select: {
                id: true,
                name: true,
                shortName: true,
                level: true,
                field: true,
                program: true,
                description: true,
              },
            },
          },
        },
      },
    });
  }

  async create(dto: CreateRoleCatalogDto) {
    await assertActiveRoleDepartment(this.prisma, dto.roleDepartmentId);
    await assertActiveProfessionType(this.prisma, dto.professionTypeId);

    try {
      return await this.prisma.roleCatalog.create({
        data: {
          name: dto.name,
          label: dto.label,
          shortName: dto.shortName,
          description: dto.description,
          roleDepartmentId: dto.roleDepartmentId ?? null,
          professionTypeId: dto.professionTypeId ?? null,
          isActive: dto.isActive ?? true,
        },
        select: roleCatalogSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Role catalog entry with name "${dto.name}" already exists`,
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateRoleCatalogDto) {
    const existing = await this.prisma.roleCatalog.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(`Role catalog entry ${id} not found`);
    }

    if (dto.roleDepartmentId !== undefined) {
      await assertActiveRoleDepartment(this.prisma, dto.roleDepartmentId);
    }
    if (dto.professionTypeId !== undefined) {
      await assertActiveProfessionType(this.prisma, dto.professionTypeId);
    }

    try {
      return await this.prisma.roleCatalog.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.label !== undefined ? { label: dto.label } : {}),
          ...(dto.shortName !== undefined ? { shortName: dto.shortName } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.roleDepartmentId !== undefined
            ? { roleDepartmentId: dto.roleDepartmentId }
            : {}),
          ...(dto.professionTypeId !== undefined
            ? { professionTypeId: dto.professionTypeId }
            : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
        select: roleCatalogSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Role catalog entry with name "${dto.name}" already exists`,
        );
      }
      throw error;
    }
  }

  async softDelete(id: string, actorId: string) {
    const existing = await this.prisma.roleCatalog.findUnique({
      where: { id },
      select: roleCatalogSelect,
    });
    if (!existing) {
      throw new NotFoundException(`Role catalog entry ${id} not found`);
    }
    if (!existing.isActive) {
      throw new BadRequestException(
        `Role catalog entry "${existing.label}" is already inactive`,
      );
    }

    const updated = await this.prisma.roleCatalog.update({
      where: { id },
      data: { isActive: false },
      select: roleCatalogSelect,
    });

    await this.auditService.log({
      actionType: 'delete',
      entityId: id,
      entityType: 'role_catalog',
      userId: actorId,
      changes: {
        softDelete: true,
        previous: { isActive: true },
        current: { isActive: false },
        name: existing.name,
        label: existing.label,
        professionTypeId: existing.professionTypeId,
        roleDepartmentId: existing.roleDepartmentId,
      },
    });

    return updated;
  }

  async getRecommendedQualifications(roleId: string, countryCode?: string) {
    const where: Prisma.RoleRecommendedQualificationWhereInput = {
      roleId,
      qualification: { isActive: true },
    };

    if (countryCode) {
      where.OR = [{ countryCode }, { countryCode: null }];
    }

    return this.prisma.roleRecommendedQualification.findMany({
      where,
      orderBy: [
        { weight: 'desc' },
        { isPreferred: 'desc' },
        { qualification: { name: 'asc' } },
      ],
      select: {
        id: true,
        weight: true,
        isPreferred: true,
        notes: true,
        countryCode: true,
        qualification: {
          select: {
            id: true,
            name: true,
            shortName: true,
            level: true,
            field: true,
            program: true,
            description: true,
          },
        },
      },
    });
  }

  async validateRoleId(roleId: string): Promise<boolean> {
    const role = await this.prisma.roleCatalog.findFirst({
      where: { id: roleId, isActive: true },
      select: { id: true },
    });
    return !!role;
  }
}
