import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { CreateProfessionTypeDto } from './dto/create-profession-type.dto';
import { UpdateProfessionTypeDto } from './dto/update-profession-type.dto';
import { QueryProfessionTypesDto } from './dto/query-profession-types.dto';

const professionTypeSelect = {
  id: true,
  name: true,
  label: true,
  description: true,
  sector: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class ProfessionTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: QueryProfessionTypesDto = {}) {
    const { sector, page, limit } = query;
    const where: Prisma.ProfessionTypeWhereInput = {
      isActive: true,
      ...(sector ? { sector } : {}),
    };
    const orderBy: Prisma.ProfessionTypeOrderByWithRelationInput[] = [
      { sortOrder: 'asc' },
      { label: 'asc' },
    ];

    const paginate = page != null || limit != null;
    if (!paginate) {
      const professionTypes = await this.prisma.professionType.findMany({
        where,
        orderBy,
        select: professionTypeSelect,
      });
      return { professionTypes };
    }

    const currentPage = page ?? 1;
    const pageSize = limit ?? 10;
    const skip = (currentPage - 1) * pageSize;

    const [professionTypes, total] = await Promise.all([
      this.prisma.professionType.findMany({
        where,
        orderBy,
        select: professionTypeSelect,
        skip,
        take: pageSize,
      }),
      this.prisma.professionType.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      professionTypes,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total,
        totalPages,
      },
    };
  }

  async findAllForAdmin(filters?: {
    sector?: 'HEALTHCARE' | 'NON_HEALTH_CARE';
    search?: string;
  }) {
    const search = filters?.search?.trim();
    const where: Prisma.ProfessionTypeWhereInput = {
      ...(filters?.sector ? { sector: filters.sector } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { label: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const professionTypes = await this.prisma.professionType.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      select: professionTypeSelect,
    });

    return { professionTypes };
  }

  async create(dto: CreateProfessionTypeDto) {
    try {
      const professionType = await this.prisma.professionType.create({
        data: {
          name: dto.name,
          label: dto.label,
          description: dto.description,
          sector: dto.sector,
          sortOrder: dto.sortOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
        select: professionTypeSelect,
      });
      return professionType;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Profession type with name "${dto.name}" already exists`,
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateProfessionTypeDto) {
    await this.assertExists(id);
    try {
      return await this.prisma.professionType.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.label !== undefined ? { label: dto.label } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.sector !== undefined ? { sector: dto.sector } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
        select: professionTypeSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Profession type with name "${dto.name}" already exists`,
        );
      }
      throw error;
    }
  }

  async softDelete(id: string, actorId: string) {
    const existing = await this.prisma.professionType.findUnique({
      where: { id },
      select: professionTypeSelect,
    });
    if (!existing) {
      throw new NotFoundException(`Profession type ${id} not found`);
    }
    if (!existing.isActive) {
      throw new BadRequestException(
        `Profession type "${existing.label}" is already inactive`,
      );
    }

    const updated = await this.prisma.professionType.update({
      where: { id },
      data: { isActive: false },
      select: professionTypeSelect,
    });

    await this.auditService.log({
      actionType: 'delete',
      entityId: id,
      entityType: 'profession_type',
      userId: actorId,
      changes: {
        softDelete: true,
        previous: { isActive: true },
        current: { isActive: false },
        name: existing.name,
        label: existing.label,
        sector: existing.sector,
      },
    });

    return updated;
  }

  private async assertExists(id: string) {
    const existing = await this.prisma.professionType.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(`Profession type ${id} not found`);
    }
  }
}

export async function assertActiveProfessionType(
  prisma: PrismaService,
  professionTypeId: string | null | undefined,
) {
  if (!professionTypeId) return;
  const pt = await prisma.professionType.findFirst({
    where: { id: professionTypeId, isActive: true },
    select: { id: true },
  });
  if (!pt) {
    throw new BadRequestException(
      `Profession type ${professionTypeId} not found or inactive`,
    );
  }
}
