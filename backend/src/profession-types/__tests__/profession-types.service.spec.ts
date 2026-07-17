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
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let auditService: { log: jest.Mock };

  beforeEach(() => {
    prisma = {
      professionType: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
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
