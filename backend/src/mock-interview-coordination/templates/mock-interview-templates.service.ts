import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateMockInterviewTemplateDto } from './dto/create-template.dto';
import { UpdateMockInterviewTemplateDto } from './dto/update-template.dto';
import { QueryMockInterviewTemplatesDto } from './dto/query-templates.dto';

@Injectable()
export class MockInterviewTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new mock interview checklist template
   */
  async create(dto: CreateMockInterviewTemplateDto) {
    // Verify role exists
    const roleExists = await this.prisma.roleCatalog.findUnique({
      where: { id: dto.roleId },
    });

    if (!roleExists) {
      throw new NotFoundException(`Role with ID "${dto.roleId}" not found`);
    }

    // Check for duplicate criterion for this role
    const existingTemplate =
      await this.prisma.mockInterviewChecklistTemplate.findUnique({
        where: {
          roleId_criterion: {
            roleId: dto.roleId,
            criterion: dto.criterion,
          },
        },
      });

    if (existingTemplate) {
      throw new ConflictException(
        `Template with criterion "${dto.criterion}" already exists for this role`,
      );
    }

    return this.prisma.mockInterviewChecklistTemplate.create({
      data: {
        roleId: dto.roleId,
        category: dto.category,
        criterion: dto.criterion,
        order: dto.order ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  /**
   * Find all templates with optional filtering
   */
  async findAll(query: QueryMockInterviewTemplatesDto) {
    const where: any = {};

    if (query.roleId) {
      where.roleId = query.roleId;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    return this.prisma.mockInterviewChecklistTemplate.findMany({
      where,
      include: {
        role: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [{ roleId: 'asc' }, { order: 'asc' }],
    });
  }

  /**
   * Find a single template by ID
   */
  async findOne(id: string) {
    const template =
      await this.prisma.mockInterviewChecklistTemplate.findUnique({
        where: { id },
        include: {
          role: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

    if (!template) {
      throw new NotFoundException(`Template with ID "${id}" not found`);
    }

    return template;
  }

  /**
   * Find all templates for a specific role
   */
  async findByRole(roleId: string) {
    // Verify role exists
    const roleExists = await this.prisma.roleCatalog.findUnique({
      where: { id: roleId },
    });

    if (!roleExists) {
      throw new NotFoundException(`Role with ID "${roleId}" not found`);
    }

    return this.prisma.mockInterviewChecklistTemplate.findMany({
      where: {
        roleId,
        isActive: true,
      },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Update a template
   */
  async update(id: string, dto: UpdateMockInterviewTemplateDto) {
    // Verify template exists
    await this.findOne(id);

    // If updating roleId or criterion, check for duplicates
    if (dto.roleId || dto.criterion) {
      const existingTemplate =
        await this.prisma.mockInterviewChecklistTemplate.findFirst({
          where: {
            id: { not: id },
            roleId: dto.roleId,
            criterion: dto.criterion,
          },
        });

      if (existingTemplate) {
        throw new ConflictException(
          `Template with criterion "${dto.criterion}" already exists for this role`,
        );
      }
    }

    return this.prisma.mockInterviewChecklistTemplate.update({
      where: { id },
      data: dto,
      include: {
        role: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  /**
   * Delete a template
   */
  async remove(id: string) {
    // Verify template exists
    await this.findOne(id);

    await this.prisma.mockInterviewChecklistTemplate.delete({
      where: { id },
    });

    return { success: true, message: 'Template deleted successfully' };
  }

  /**
   * Bulk create templates for a role
   */
  async bulkCreate(
    roleId: string,
    templates: Omit<CreateMockInterviewTemplateDto, 'roleId'>[],
  ) {
    // Verify role exists
    const roleExists = await this.prisma.roleCatalog.findUnique({
      where: { id: roleId },
    });

    if (!roleExists) {
      throw new NotFoundException(`Role with ID "${roleId}" not found`);
    }

    const createdTemplates = await Promise.all(
      templates.map((template) =>
        this.prisma.mockInterviewChecklistTemplate.upsert({
          where: {
            roleId_criterion: {
              roleId,
              criterion: template.criterion,
            },
          },
          update: {
            category: template.category,
            order: template.order ?? 0,
            isActive: template.isActive ?? true,
          },
          create: {
            roleId,
            category: template.category,
            criterion: template.criterion,
            order: template.order ?? 0,
            isActive: template.isActive ?? true,
          },
        }),
      ),
    );

    return {
      success: true,
      count: createdTemplates.length,
      data: createdTemplates,
    };
  }
}
