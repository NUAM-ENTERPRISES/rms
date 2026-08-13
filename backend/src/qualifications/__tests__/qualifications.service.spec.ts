import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { QualificationsService } from '../qualifications.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { QualificationLevel } from '../dto/query-qualifications.dto';

describe('QualificationsService', () => {
  let service: QualificationsService;
  let prisma: {
    qualification: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    qualificationAlias: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let auditService: { log: jest.Mock };

  beforeEach(() => {
    prisma = {
      qualification: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      qualificationAlias: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) =>
      fn(prisma),
    );
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    service = new QualificationsService(
      prisma as unknown as PrismaService,
      auditService as unknown as AuditService,
    );
  });

  it('creates a qualification with aliases', async () => {
    prisma.qualification.create.mockResolvedValue({
      id: 'q-1',
      name: 'Bachelor of Science in Nursing (BSc Nursing)',
      shortName: 'BSc Nursing',
      level: 'BACHELOR',
      field: 'Nursing',
      aliases: [{ alias: 'RN', isCommon: true }],
    });

    const result = await service.create({
      name: 'Bachelor of Science in Nursing (BSc Nursing)',
      shortName: 'BSc Nursing',
      level: QualificationLevel.BACHELOR,
      field: 'Nursing',
      aliases: [
        { alias: 'RN', isCommon: true },
        { alias: 'rn', isCommon: false },
      ],
    });

    expect(result.shortName).toBe('BSc Nursing');
    expect(prisma.qualification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Bachelor of Science in Nursing (BSc Nursing)',
          aliases: {
            create: [{ alias: 'RN', isCommon: true }],
          },
        }),
      }),
    );
  });

  it('throws conflict on duplicate name', async () => {
    const error = new Prisma.PrismaClientKnownRequestError('dup', {
      code: 'P2002',
      clientVersion: 'test',
    });
    prisma.qualification.create.mockRejectedValue(error);

    await expect(
      service.create({
        name: 'MBBS',
        level: QualificationLevel.BACHELOR,
        field: 'Medicine',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws not found on update of missing id', async () => {
    prisma.qualification.findUnique.mockResolvedValue(null);

    await expect(
      service.update('missing', { field: 'Nursing' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('replaces aliases on update when aliases are sent', async () => {
    prisma.qualification.findUnique.mockResolvedValue({ id: 'q-1' });
    prisma.qualificationAlias.deleteMany.mockResolvedValue({ count: 1 });
    prisma.qualificationAlias.createMany.mockResolvedValue({ count: 1 });
    prisma.qualification.update.mockResolvedValue({
      id: 'q-1',
      name: 'MBBS',
      aliases: [{ alias: 'MB', isCommon: true }],
    });

    await service.update('q-1', {
      aliases: [{ alias: 'MB', isCommon: true }],
    });

    expect(prisma.qualificationAlias.deleteMany).toHaveBeenCalledWith({
      where: { qualificationId: 'q-1' },
    });
    expect(prisma.qualificationAlias.createMany).toHaveBeenCalledWith({
      data: [
        { qualificationId: 'q-1', alias: 'MB', isCommon: true },
      ],
    });
  });

  it('includes inactive qualifications in admin list', async () => {
    prisma.qualification.findMany.mockResolvedValue([
      { id: 'q-1', name: 'GNM', isActive: false },
    ]);

    await service.findAllForAdmin({ q: 'gnm' });

    expect(prisma.qualification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.any(Array),
        }),
      }),
    );
    const call = prisma.qualification.findMany.mock.calls[0][0];
    expect(call.where.isActive).toBeUndefined();
  });

  it('soft-deletes and writes audit log', async () => {
    prisma.qualification.findUnique.mockResolvedValue({
      id: 'q-1',
      name: 'MBBS',
      shortName: 'MBBS',
      level: 'BACHELOR',
      field: 'Medicine',
      isActive: true,
    });
    prisma.qualification.update.mockResolvedValue({
      id: 'q-1',
      name: 'MBBS',
      isActive: false,
    });

    await service.softDelete('q-1', 'actor-1');

    expect(prisma.qualification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'q-1' },
        data: { isActive: false },
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'delete',
        entityType: 'qualification',
        entityId: 'q-1',
        userId: 'actor-1',
      }),
    );
  });

  it('rejects soft-delete when already inactive', async () => {
    prisma.qualification.findUnique.mockResolvedValue({
      id: 'q-1',
      name: 'MBBS',
      isActive: false,
    });

    await expect(service.softDelete('q-1', 'actor-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
