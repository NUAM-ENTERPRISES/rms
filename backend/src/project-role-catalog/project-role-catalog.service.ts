import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { QueryProjectRoleCatalogDto } from './dto/query-project-role-catalog.dto';

@Injectable()
export class ProjectRoleCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  private buildSearchConditions(search: string): Prisma.ProjectRoleWhereInput[] {
    const normalized = search.trim().toLowerCase();
    const variants = new Set<string>([normalized]);

    if (normalized.endsWith('e')) {
      variants.add(`${normalized.slice(0, -1)}ing`);
    }
    if (normalized.endsWith('ing')) {
      variants.add(`${normalized.slice(0, -3)}e`);
    }
    if (normalized.endsWith('ist')) {
      variants.add(`${normalized.slice(0, -3)}y`);
    }
    if (normalized.endsWith('y')) {
      variants.add(`${normalized.slice(0, -1)}ies`);
    }

    const tokens = normalized.split(/[\s-]+/).filter(Boolean);
    tokens.forEach((token) => variants.add(token));

    return Array.from(variants).flatMap((variant) => [
      { name: { contains: variant, mode: 'insensitive' } },
      { category: { contains: variant, mode: 'insensitive' } },
    ]);
  }

  async findAll(query: QueryProjectRoleCatalogDto) {
    const { search, page = 1, limit = 10, category } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.ProjectRoleWhereInput = {};

    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }

    if (search) {
      const searchConditions = this.buildSearchConditions(search);
      if (where.OR) {
        where.OR = [...where.OR, ...searchConditions];
      } else {
        where.OR = searchConditions;
      }
    }

    const [roles, total] = await Promise.all([
      this.prisma.projectRole.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.projectRole.count({ where }),
    ]);

    return {
      success: true,
      data: {
        roles,
        pagination: {
          page,
          limit,
          total,
          pages: Math.max(1, Math.ceil(total / limit)),
        },
      },
      message: 'Project roles retrieved successfully',
    };
  }

  async findOne(id: string) {
    const role = await this.prisma.projectRole.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Project role not found');
    }

    return {
      success: true,
      data: role,
      message: 'Project role retrieved successfully',
    };
  }
}
