import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { QueryRoleDepartmentDto } from './dto/query-role-department.dto';

@Injectable()
export class RoleDepartmentsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Helpful startup log to confirm module is loaded
    console.log('🔧 RoleDepartmentsService initialized');
  }

  private buildSearchConditions(search: string) {
    const normalized = search.trim();
    const tokens = normalized.split(/\s+/).filter(Boolean);
    const variants = new Set([normalized, ...tokens]);

    return Array.from(variants).flatMap((v) => [
      { name: { contains: v, mode: 'insensitive' } },
      { label: { contains: v, mode: 'insensitive' } },
      { shortName: { contains: v, mode: 'insensitive' } },
      { description: { contains: v, mode: 'insensitive' } },
    ]);
  }

  async findAll(query: QueryRoleDepartmentDto) {
    const { id, search, page = 1, limit = 20, includeRoles = true } = query;

    const skip = (page - 1) * limit;

    // If ID is provided, return only that department (consistent response shape)
    if (id) {
      const dept = await this.prisma.roleDepartment.findUnique({
        where: { id },
        select: includeRoles
          ? {
              id: true,
              name: true,
              label: true,
              shortName: true,
              description: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
              roles: {
                select: {
                  id: true,
                  name: true,
                  label: true,
                  shortName: true,
                  description: true,
                  type: true,
                  isActive: true,
                },
                orderBy: { name: 'asc' },
              },
            }
          : {
              id: true,
              name: true,
              label: true,
              shortName: true,
              description: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
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

    const where: any = {};
    if (search) {
      where.OR = this.buildSearchConditions(search);
    }

    const [departments, total] = await Promise.all([
      this.prisma.roleDepartment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: includeRoles
          ? {
              id: true,
              name: true,
              label: true,
              shortName: true,
              description: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
              roles: {
                select: {
                  id: true,
                  name: true,
                  label: true,
                  shortName: true,
                  description: true,
                  type: true,
                  isActive: true,
                },
                orderBy: { name: 'asc' },
              },
            }
          : {
              id: true,
              name: true,
              label: true,
              shortName: true,
              description: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
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
}
