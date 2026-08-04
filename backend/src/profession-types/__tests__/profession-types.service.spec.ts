import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProfessionTypesService } from '../profession-types.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';

describe('ProfessionTypesService', () => {
  let service: ProfessionTypesService;
  let prisma: {
    professionType: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
  };
  let auditService: { log: jest.Mock };

  beforeEach(() => {
    prisma = {
      professionType: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    service = new ProfessionTypesService(
      prisma as unknown as PrismaService,
      auditService as unknown as AuditService,
    );
  });

  it('creates a profession type', async () => {
    prisma.professionType.create.mockResolvedValue({
      id: 'pt-1',
      name: 'nurse',
      label: 'Nurse',
      sector: 'HEALTHCARE',
    });

    const result = await service.create({
      name: 'nurse',
      label: 'Nurse',
      sector: 'HEALTHCARE' as never,
    });

    expect(result.name).toBe('nurse');
    expect(prisma.professionType.create).toHaveBeenCalled();
  });

  it('throws conflict on duplicate name', async () => {
    const error = new Prisma.PrismaClientKnownRequestError('dup', {
      code: 'P2002',
      clientVersion: 'test',
    });
    prisma.professionType.create.mockRejectedValue(error);

    await expect(
      service.create({ name: 'nurse', label: 'Nurse' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws not found on update of missing id', async () => {
    prisma.professionType.findUnique.mockResolvedValue(null);

    await expect(
      service.update('missing', { label: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('filters admin list by sector and search', async () => {
    prisma.professionType.findMany.mockResolvedValue([]);

    await service.findAllForAdmin({
      sector: 'HEALTHCARE',
      search: 'nurse',
    });

    expect(prisma.professionType.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sector: 'HEALTHCARE',
          OR: expect.any(Array),
        }),
      }),
    );
  });

  it('paginates public list when page/limit are provided', async () => {
    prisma.professionType.findMany.mockResolvedValue([
      { id: 'pt-1', label: 'Nurse' },
    ]);
    prisma.professionType.count.mockResolvedValue(25);

    const result = await service.findAll({
      sector: 'HEALTHCARE',
      page: 2,
      limit: 10,
    });

    expect(prisma.professionType.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true, sector: 'HEALTHCARE' },
        skip: 10,
        take: 10,
      }),
    );
    expect(result).toEqual({
      professionTypes: [{ id: 'pt-1', label: 'Nurse' }],
      pagination: {
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
      },
    });
  });

  it('returns all active types when pagination params are omitted', async () => {
    prisma.professionType.findMany.mockResolvedValue([
      { id: 'pt-1', label: 'Nurse' },
    ]);

    const result = await service.findAll({ sector: 'HEALTHCARE' });

    expect(prisma.professionType.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true, sector: 'HEALTHCARE' },
      }),
    );
    expect(prisma.professionType.count).not.toHaveBeenCalled();
    expect(result).toEqual({
      professionTypes: [{ id: 'pt-1', label: 'Nurse' }],
    });
  });

  it('soft-deletes and writes audit log', async () => {
    prisma.professionType.findUnique.mockResolvedValue({
      id: 'pt-1',
      name: 'nurse',
      label: 'Nurse',
      sector: 'HEALTHCARE',
      isActive: true,
    });
    prisma.professionType.update.mockResolvedValue({
      id: 'pt-1',
      name: 'nurse',
      label: 'Nurse',
      isActive: false,
    });

    await service.softDelete('pt-1', 'actor-1');

    expect(prisma.professionType.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pt-1' },
        data: { isActive: false },
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'delete',
        entityType: 'profession_type',
        entityId: 'pt-1',
        userId: 'actor-1',
      }),
    );
  });

  it('rejects soft-delete when already inactive', async () => {
    prisma.professionType.findUnique.mockResolvedValue({
      id: 'pt-1',
      label: 'Nurse',
      isActive: false,
    });

    await expect(service.softDelete('pt-1', 'actor-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
