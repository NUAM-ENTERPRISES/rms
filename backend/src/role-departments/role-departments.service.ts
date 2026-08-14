import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { QueryRoleDepartmentDto } from './dto/query-role-department.dto';
import { CreateRoleDepartmentDto } from './dto/create-role-department.dto';
import { UpdateRoleDepartmentDto } from './dto/update-role-department.dto';

const nestedRoleSelect = {
  id: true,
  name: true,
  label: true,
  shortName: true,
  description: true,
  professionTypeId: true,
  isActive: true,
  professionType: {
    select: {
      id: true,
      name: true,
      label: true,
      sector: true,
    },
  },
} as const;

const departmentSelectBase = {
  id: true,
  name: true,
  label: true,
  shortName: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class RoleDepartmentsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  onModuleInit() {
    console.log('🔧 RoleDepartmentsService initialized');
  }

  private buildSearchConditions(search: string) {
    const normalized = search.trim();
    const tokens = normalized.split(/\s+/).filter(Boolean);
    const variants = new Set([normalized, ...tokens]);

    return Array.from(variants).flatMap((v) => [
      { name: { contains: v, mode: 'insensitive' as const } },
      { label: { contains: v, mode: 'insensitive' as const } },
      { shortName: { contains: v, mode: 'insensitive' as const } },
      { description: { contains: v, mode: 'insensitive' as const } },
    ]);
  }

  async findAll(query: QueryRoleDepartmentDto) {
    const {
      id,
      search,
      page = 1,
      limit = 20,
      includeRoles = true,
      professionTypeId,
    } = query;

    const skip = (page - 1) * limit;

    const rolesSelect = includeRoles
      ? {
          roles: {
            ...(professionTypeId
              ? { where: { professionTypeId, isActive: true } }
              : {}),
            select: nestedRoleSelect,
            orderBy: { name: 'asc' as const },
          },
        }
      : {};

    if (id) {
      const dept = await this.prisma.roleDepartment.findUnique({
        where: { id },
        select: {
          ...departmentSelectBase,
          ...rolesSelect,
        },
      });

      const departments = dept ? [dept] : [];
      const total = dept ? 1 : 0;

      return {
        departments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      };
    }

    const where: Prisma.RoleDepartmentWhereInput = {};
    if (search) {
      where.OR = this.buildSearchConditions(search);
    }
    if (professionTypeId) {
      where.roles = {
        some: { professionTypeId, isActive: true },
      };
    }

    const [departments, total] = await Promise.all([
      this.prisma.roleDepartment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          ...departmentSelectBase,
          ...rolesSelect,
        },
      }),
      this.prisma.roleDepartment.count({ where }),
    ]);

    return {
      departments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async create(dto: CreateRoleDepartmentDto) {
    try {
      return await this.prisma.roleDepartment.create({
        data: {
          name: dto.name,
          label: dto.label,
          shortName: dto.shortName,
          description: dto.description,
          isActive: dto.isActive ?? true,
        },
        select: departmentSelectBase,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Role department with name "${dto.name}" already exists`,
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateRoleDepartmentDto) {
    await this.assertExists(id);
    try {
      return await this.prisma.roleDepartment.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.label !== undefined ? { label: dto.label } : {}),
          ...(dto.shortName !== undefined ? { shortName: dto.shortName } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
        select: departmentSelectBase,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Role department with name "${dto.name}" already exists`,
        );
      }
      throw error;
    }
  }

  async softDelete(id: string, actorId: string) {
    const existing = await this.prisma.roleDepartment.findUnique({
      where: { id },
      select: departmentSelectBase,
    });
    if (!existing) {
      throw new NotFoundException(`Role department ${id} not found`);
    }
    if (!existing.isActive) {
      throw new BadRequestException(
        `Role department "${existing.label}" is already inactive`,
      );
    }

    const updated = await this.prisma.roleDepartment.update({
      where: { id },
      data: { isActive: false },
      select: departmentSelectBase,
    });

    await this.auditService.log({
      actionType: 'delete',
      entityId: id,
      entityType: 'role_department',
      userId: actorId,
      changes: {
        softDelete: true,
        previous: { isActive: true },
        current: { isActive: false },
        name: existing.name,
        label: existing.label,
      },
    });

    return updated;
  }

  private async assertExists(id: string) {
    const existing = await this.prisma.roleDepartment.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(`Role department ${id} not found`);
    }
  }
}

export async function assertActiveRoleDepartment(
  prisma: PrismaService,
  roleDepartmentId: string | null | undefined,
) {
  if (!roleDepartmentId) return;
  const dept = await prisma.roleDepartment.findFirst({
    where: { id: roleDepartmentId, isActive: true },
    select: { id: true },
  });
  if (!dept) {
    throw new BadRequestException(
      `Role department ${roleDepartmentId} not found or inactive`,
    );
  }
}
