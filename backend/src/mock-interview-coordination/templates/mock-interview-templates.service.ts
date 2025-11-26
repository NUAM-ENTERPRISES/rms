import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateMockInterviewTemplateDto } from './dto/create-template.dto';
import { UpdateMockInterviewTemplateDto } from './dto/update-template.dto';
import { QueryMockInterviewTemplatesDto } from './dto/query-templates.dto';
import { CreateTemplateItemDto } from './dto/create-template-item.dto';
import { UpdateTemplateItemDto } from './dto/update-template-item.dto';

@Injectable()
export class MockInterviewTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new mock interview template with items
   */
  async create(dto: CreateMockInterviewTemplateDto) {
    // Verify role exists
    const roleExists = await this.prisma.roleCatalog.findUnique({
      where: { id: dto.roleId },
    });

    if (!roleExists) {
      throw new NotFoundException(`Role with ID "${dto.roleId}" not found`);
    }

    // Check for duplicate template name for this role
    const existingTemplate = await this.prisma.mockInterviewTemplate.findUnique(
      {
        where: {
          roleId_name: {
            roleId: dto.roleId,
            name: dto.name,
          },
        },
      },
    );

    if (existingTemplate) {
      throw new ConflictException(
        `Template with name "${dto.name}" already exists for this role`,
      );
    }

    // Validate no duplicate categories in items
    if (dto.items && dto.items.length > 0) {
      const categories = dto.items.map((item) => item.category);
      const uniqueCategories = new Set(categories);
      if (categories.length !== uniqueCategories.size) {
        throw new BadRequestException(
          'Template cannot have duplicate categories. Each category can only appear once.',
        );
      }
    }

    // Create template with items in transaction
    return this.prisma.$transaction(async (tx) => {
      const template = await tx.mockInterviewTemplate.create({
        data: {
          roleId: dto.roleId,
          name: dto.name,
          description: dto.description,
          isActive: dto.isActive ?? true,
        },
      });

      // Create items if provided
      if (dto.items && dto.items.length > 0) {
        await tx.mockInterviewTemplateItem.createMany({
          data: dto.items.map((item, index) => ({
            templateId: template.id,
            category: item.category,
            criterion: item.criterion,
            order: item.order ?? index,
          })),
        });
      }

      // Return template with items and role
      return tx.mockInterviewTemplate.findUnique({
        where: { id: template.id },
        include: {
          role: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          items: {
            orderBy: [{ category: 'asc' }, { order: 'asc' }],
          },
        },
      });
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

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    return this.prisma.mockInterviewTemplate.findMany({
      where,
      include: {
        role: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        items: {
          orderBy: [{ category: 'asc' }, { order: 'asc' }],
        },
        _count: {
          select: {
            items: true,
            mockInterviews: true,
          },
        },
      },
      orderBy: [{ roleId: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Find a single template by ID with all items
   */
  async findOne(id: string) {
    const template = await this.prisma.mockInterviewTemplate.findUnique({
      where: { id },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        items: {
          orderBy: [{ category: 'asc' }, { order: 'asc' }],
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

    return this.prisma.mockInterviewTemplate.findMany({
      where: {
        roleId,
        isActive: true,
      },
      include: {
        items: {
          orderBy: [{ category: 'asc' }, { order: 'asc' }],
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update a template (name, description, isActive only)
   */
  async update(id: string, dto: UpdateMockInterviewTemplateDto) {
    // Verify template exists
    await this.findOne(id);

    // If updating name, check for duplicates
    if (dto.name) {
      const existing = await this.prisma.mockInterviewTemplate.findFirst({
        where: {
          id: { not: id },
          roleId: dto.roleId,
          name: dto.name,
        },
      });

      if (existing) {
        throw new ConflictException(
          `Template with name "${dto.name}" already exists for this role`,
        );
      }
    }

    return this.prisma.mockInterviewTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive,
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        items: {
          orderBy: [{ category: 'asc' }, { order: 'asc' }],
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

    await this.prisma.mockInterviewTemplate.delete({
      where: { id },
    });

    return { success: true, message: 'Template deleted successfully' };
  }

  /**
   * Add an item to a template
   */
  async addItem(templateId: string, dto: CreateTemplateItemDto) {
    // Verify template exists
    const template = await this.findOne(templateId);

    // Check for duplicate criterion in same category (only constraint)
    const existingItem = await this.prisma.mockInterviewTemplateItem.findUnique(
      {
        where: {
          templateId_category_criterion: {
            templateId,
            category: dto.category,
            criterion: dto.criterion,
          },
        },
      },
    );

    if (existingItem) {
      throw new ConflictException(
        `Criterion "${dto.criterion}" already exists in category "${dto.category}"`,
      );
    }

    return this.prisma.mockInterviewTemplateItem.create({
      data: {
        templateId,
        category: dto.category,
        criterion: dto.criterion,
        order: dto.order ?? 0,
      },
    });
  }

  /**
   * Update a template item
   */
  async updateItem(
    templateId: string,
    itemId: string,
    dto: UpdateTemplateItemDto,
  ) {
    // Verify item exists and belongs to template
    const item = await this.prisma.mockInterviewTemplateItem.findFirst({
      where: {
        id: itemId,
        templateId,
      },
    });

    if (!item) {
      throw new NotFoundException(
        `Template item with ID "${itemId}" not found in this template`,
      );
    }

    // If updating criterion or category, check for duplicate criterion in the target category
    if (dto.criterion || dto.category) {
      const targetCategory = dto.category || item.category;
      const targetCriterion = dto.criterion || item.criterion;

      const existing = await this.prisma.mockInterviewTemplateItem.findFirst({
        where: {
          templateId,
          category: targetCategory,
          criterion: targetCriterion,
          id: { not: itemId },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Criterion "${targetCriterion}" already exists in category "${targetCategory}"`,
        );
      }
    }

    return this.prisma.mockInterviewTemplateItem.update({
      where: { id: itemId },
      data: dto,
    });
  }

  /**
   * Remove an item from a template
   */
  async removeItem(templateId: string, itemId: string) {
    // Verify item exists and belongs to template
    const item = await this.prisma.mockInterviewTemplateItem.findFirst({
      where: {
        id: itemId,
        templateId,
      },
    });

    if (!item) {
      throw new NotFoundException(
        `Template item with ID "${itemId}" not found in this template`,
      );
    }

    await this.prisma.mockInterviewTemplateItem.delete({
      where: { id: itemId },
    });

    return { success: true, message: 'Template item deleted successfully' };
  }
}
