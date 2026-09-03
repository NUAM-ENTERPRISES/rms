import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { QualificationLevel } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export type CatalogTarget =
  | 'qualification'
  | 'qualification_alias'
  | 'role_department'
  | 'role_catalog';

export type QualificationLevelInput = QualificationLevel;

export interface ApproveCatalogValueInput {
  target: CatalogTarget;
  /** Canonical name to create, or the alias text for `qualification_alias`. */
  value: string;
  /** Required for `qualification_alias`: the qualification the alias belongs to. */
  qualificationId?: string;
  /** Required for `qualification`: the catalog has no neutral level to fall back on. */
  level?: QualificationLevelInput;
  /** Required for `qualification`: broad discipline, e.g. "Nursing". */
  field?: string;
  /** Required for `role_catalog`: which department and profession it sits in. */
  roleDepartmentId?: string;
  professionTypeId?: string;
  label?: string;
  shortName?: string;
}

export interface ApproveCatalogValueResult {
  target: CatalogTarget;
  id: string;
  name: string;
  label: string;
  created: boolean;
}

/**
 * Creates catalog rows that a reviewer explicitly approved during an import.
 *
 * The AI never reaches this service. It only ever proposes; a human with the
 * relevant catalog permission has to approve, which is what stops the sheet
 * from spawning "ICU", "I.C.U" and "Intensive Care Unit" as three rows.
 *
 * Aliases are strongly preferred over new qualifications, because a new spelling
 * of an existing qualification is a naming problem, not a catalog gap.
 */
@Injectable()
export class CatalogApprovalService {
  private readonly logger = new Logger(CatalogApprovalService.name);

  constructor(private readonly prisma: PrismaService) {}

  async approve(
    input: ApproveCatalogValueInput,
    userId: string,
  ): Promise<ApproveCatalogValueResult> {
    const value = input.value?.trim();
    if (!value) {
      throw new BadRequestException('A non-empty value is required.');
    }

    switch (input.target) {
      case 'qualification_alias':
        return this.createQualificationAlias(value, input, userId);
      case 'qualification':
        return this.createQualification(value, input, userId);
      case 'role_department':
        return this.createRoleDepartment(value, input, userId);
      case 'role_catalog':
        return this.createRoleCatalog(value, input, userId);
      default:
        throw new BadRequestException(`Unsupported target: ${input.target}`);
    }
  }

  private async createQualificationAlias(
    value: string,
    input: ApproveCatalogValueInput,
    userId: string,
  ): Promise<ApproveCatalogValueResult> {
    if (!input.qualificationId) {
      throw new BadRequestException(
        'qualificationId is required when approving an alias.',
      );
    }

    const qualification = await this.prisma.qualification.findUnique({
      where: { id: input.qualificationId },
      select: { id: true, name: true, shortName: true },
    });
    if (!qualification) {
      throw new NotFoundException('Qualification not found.');
    }

    const existing = await this.prisma.qualificationAlias.findFirst({
      where: {
        qualificationId: qualification.id,
        alias: { equals: value, mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (existing) {
      return {
        target: 'qualification_alias',
        id: existing.id,
        name: value,
        label: qualification.shortName ?? qualification.name,
        created: false,
      };
    }

    const alias = await this.prisma.qualificationAlias.create({
      data: { qualificationId: qualification.id, alias: value },
      select: { id: true },
    });

    this.logger.log(
      `User ${userId} added alias "${value}" to qualification ${qualification.name}.`,
    );

    return {
      target: 'qualification_alias',
      id: alias.id,
      name: value,
      label: qualification.shortName ?? qualification.name,
      created: true,
    };
  }

  private async createQualification(
    value: string,
    input: ApproveCatalogValueInput,
    userId: string,
  ): Promise<ApproveCatalogValueResult> {
    const duplicate = await this.prisma.qualification.findFirst({
      where: { name: { equals: value, mode: 'insensitive' } },
      select: { id: true, name: true },
    });
    if (duplicate) {
      throw new ConflictException(
        `Qualification "${duplicate.name}" already exists. Add an alias instead.`,
      );
    }

    if (!input.level) {
      throw new BadRequestException(
        'level is required when creating a qualification (CERTIFICATE, DIPLOMA, BACHELOR, MASTER or DOCTORATE).',
      );
    }
    if (!input.field?.trim()) {
      throw new BadRequestException(
        'field is required when creating a qualification, e.g. "Nursing".',
      );
    }

    const created = await this.prisma.qualification.create({
      data: {
        name: value,
        shortName: input.shortName?.trim() || value,
        level: input.level,
        field: input.field.trim(),
        isActive: true,
      },
      select: { id: true, name: true, shortName: true },
    });

    this.logger.log(`User ${userId} created qualification "${value}".`);

    return {
      target: 'qualification',
      id: created.id,
      name: created.name,
      label: created.shortName ?? created.name,
      created: true,
    };
  }

  private async createRoleDepartment(
    value: string,
    input: ApproveCatalogValueInput,
    userId: string,
  ): Promise<ApproveCatalogValueResult> {
    const name = this.slugify(value);
    const duplicate = await this.prisma.roleDepartment.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true, label: true },
    });
    if (duplicate) {
      throw new ConflictException(
        `Department "${duplicate.label}" already exists.`,
      );
    }

    const created = await this.prisma.roleDepartment.create({
      data: {
        name,
        label: input.label?.trim() || value,
        shortName: input.shortName?.trim() || null,
        isActive: true,
      },
      select: { id: true, name: true, label: true },
    });

    this.logger.log(`User ${userId} created department "${value}".`);

    return {
      target: 'role_department',
      id: created.id,
      name: created.name,
      label: created.label,
      created: true,
    };
  }

  private async createRoleCatalog(
    value: string,
    input: ApproveCatalogValueInput,
    userId: string,
  ): Promise<ApproveCatalogValueResult> {
    if (!input.roleDepartmentId) {
      throw new BadRequestException(
        'roleDepartmentId is required when approving a role.',
      );
    }

    const name = this.slugify(value);
    const duplicate = await this.prisma.roleCatalog.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true, label: true },
    });
    if (duplicate) {
      throw new ConflictException(`Role "${duplicate.label}" already exists.`);
    }

    const created = await this.prisma.roleCatalog.create({
      data: {
        name,
        label: input.label?.trim() || value,
        shortName: input.shortName?.trim() || null,
        roleDepartmentId: input.roleDepartmentId,
        professionTypeId: input.professionTypeId ?? null,
        isActive: true,
      },
      select: { id: true, name: true, label: true },
    });

    this.logger.log(`User ${userId} created role "${value}".`);

    return {
      target: 'role_catalog',
      id: created.id,
      name: created.name,
      label: created.label,
      created: true,
    };
  }

  private slugify(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
}
