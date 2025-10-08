import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { QueryRolesDto } from './dto/query-roles.dto';

@Injectable()
export class RoleCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(queryDto: QueryRolesDto) {
    const {
      q,
      category,
      isClinical,
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
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (isClinical !== undefined) {
      where.isClinical = isClinical;
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
    const [roles, total] = await Promise.all([
      this.prisma.roleCatalog.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          slug: true,
          category: true,
          subCategory: true,
          isClinical: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
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
        id: true,
        name: true,
        slug: true,
        category: true,
        subCategory: true,
        isClinical: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
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

  async getRecommendedQualifications(roleId: string, countryCode?: string) {
    const where: any = {
      roleId,
      qualification: { isActive: true },
    };

    if (countryCode) {
      where.OR = [
        { countryCode },
        { countryCode: null }, // Include global recommendations
      ];
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
