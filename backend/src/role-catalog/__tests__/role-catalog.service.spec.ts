import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RoleCatalogService } from '../role-catalog.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';

describe('RoleCatalogService', () => {
  let service: RoleCatalogService;
  let prisma: {
    roleCatalog: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    roleDepartment: { findFirst: jest.Mock };
    professionType: { findFirst: jest.Mock };
  };
  let auditService: { log: jest.Mock };

  beforeEach(() => {
    prisma = {
      roleCatalog: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      roleDepartment: { findFirst: jest.fn() },
      professionType: { findFirst: jest.fn() },
    };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };

    service = new RoleCatalogService(
      prisma as unknown as PrismaService,
      auditService as unknown as AuditService,
    );
  });

  describe('create', () => {
    it('creates a role linked to profession and department', async () => {
      prisma.roleDepartment.findFirst.mockResolvedValue({ id: 'dept-1' });
      prisma.professionType.findFirst.mockResolvedValue({ id: 'pt-nurse' });
      prisma.roleCatalog.create.mockResolvedValue({
        id: 'role-1',
        name: 'emergency_staff_nurse',
        label: 'Emergency Staff Nurse',
        roleDepartmentId: 'dept-1',
        professionTypeId: 'pt-nurse',
        professionType: { id: 'pt-nurse', name: 'nurse', label: 'Nurse' },
        roleDepartment: {
          id: 'dept-1',
          name: 'emergency',
          label: 'Emergency Department',
        },
      });

      const result = await service.create({
        name: 'emergency_staff_nurse',
        label: 'Emergency Staff Nurse',
        roleDepartmentId: 'dept-1',
        professionTypeId: 'pt-nurse',
      });

      expect(prisma.roleCatalog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'emergency_staff_nurse',
            roleDepartmentId: 'dept-1',
            professionTypeId: 'pt-nurse',
          }),
        }),
      );
      expect(result.professionTypeId).toBe('pt-nurse');
    });

    it('allows creating a role without department or profession', async () => {
      prisma.roleCatalog.create.mockResolvedValue({
        id: 'role-2',
        name: 'generic_role',
        label: 'Generic Role',
        roleDepartmentId: null,
        professionTypeId: null,
      });

      await service.create({
        name: 'generic_role',
        label: 'Generic Role',
      });

      expect(prisma.roleDepartment.findFirst).not.toHaveBeenCalled();
      expect(prisma.professionType.findFirst).not.toHaveBeenCalled();
      expect(prisma.roleCatalog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            roleDepartmentId: null,
            professionTypeId: null,
          }),
        }),
      );
    });

    it('rejects invalid profession type id', async () => {
      prisma.professionType.findFirst.mockResolvedValue(null);

      await expect(
        service.create({
          name: 'bad_role',
          label: 'Bad Role',
          professionTypeId: 'missing',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects invalid department id', async () => {
      prisma.roleDepartment.findFirst.mockResolvedValue(null);

      await expect(
        service.create({
          name: 'bad_role',
          label: 'Bad Role',
          roleDepartmentId: 'missing',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws conflict on duplicate name', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
      });
      prisma.roleCatalog.create.mockRejectedValue(error);

      await expect(
        service.create({
          name: 'emergency_staff_nurse',
          label: 'Emergency Staff Nurse',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findAll', () => {
    it('filters by professionTypeId instead of type string', async () => {
      prisma.roleCatalog.findMany.mockResolvedValue([]);
      prisma.roleCatalog.count.mockResolvedValue(0);

      await service.findAll({ professionTypeId: 'pt-nurse', page: 1, limit: 20 });

      expect(prisma.roleCatalog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ professionTypeId: 'pt-nurse' }),
        }),
      );
    });

    it('filters by profession sector', async () => {
      prisma.roleCatalog.findMany.mockResolvedValue([]);
      prisma.roleCatalog.count.mockResolvedValue(0);

      await service.findAll({
        sector: 'HEALTHCARE' as never,
        page: 1,
        limit: 20,
      });

      expect(prisma.roleCatalog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            professionType: { sector: 'HEALTHCARE' },
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('throws not found for missing role', async () => {
      prisma.roleCatalog.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { label: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('softDelete', () => {
    it('soft-deletes and writes audit log', async () => {
      prisma.roleCatalog.findUnique.mockResolvedValue({
        id: 'role-1',
        name: 'emergency_staff_nurse',
        label: 'Emergency Staff Nurse',
        isActive: true,
        professionTypeId: 'pt-nurse',
        roleDepartmentId: 'dept-1',
      });
      prisma.roleCatalog.update.mockResolvedValue({
        id: 'role-1',
        isActive: false,
      });

      await service.softDelete('role-1', 'actor-1');

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'delete',
          entityType: 'role_catalog',
          entityId: 'role-1',
          userId: 'actor-1',
        }),
      );
    });
  });
});
