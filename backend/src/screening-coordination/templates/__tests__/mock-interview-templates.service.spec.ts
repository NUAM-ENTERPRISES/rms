import { Test, TestingModule } from '@nestjs/testing';
import { ScreeningTemplatesService } from '../screening-templates.service';
import { PrismaService } from '../../../database/prisma.service';
import { CreateScreeningTemplateDto } from '../dto/create-template.dto';

describe('ScreeningTemplatesService', () => {
  let service: ScreeningTemplatesService;
  let prisma: any;

  const mockPrisma = {
    roleCatalog: { findUnique: jest.fn() },
    screeningTemplate: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    screeningTemplateItem: { createMany: jest.fn() },
    $transaction: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreeningTemplatesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(ScreeningTemplatesService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => jest.clearAllMocks());

  it('allows creating a template with multiple items in the same category', async () => {
    const dto: CreateScreeningTemplateDto = {
      roleId: 'role1',
      name: 'Template A',
      description: 'desc',
      isActive: true,
      items: [
        { category: 'TECH', criterion: 'Crit A', order: 0 },
        { category: 'TECH', criterion: 'Crit B', order: 1 },
      ],
    } as any;

    // role exists
    prisma.roleCatalog.findUnique.mockResolvedValue({ id: 'role1' });

    // no existing template with same role+name
    prisma.screeningTemplate.findUnique.mockResolvedValueOnce(null);

    // simulate transaction behavior
    const tx = {
      screeningTemplate: {
        create: jest.fn().mockResolvedValue({ id: 't1' }),
        findUnique: jest.fn().mockResolvedValue({ id: 't1', name: 'Template A' }),
      },
      screeningTemplateItem: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
    } as any;

    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    // execute create
    const res = await service.create(dto);

    // transaction should be called
    expect(prisma.$transaction).toHaveBeenCalled();

    // ensure createMany was called and allowed duplicate categories
    expect(tx.screeningTemplateItem.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ category: 'TECH', criterion: 'Crit A' }),
          expect.objectContaining({ category: 'TECH', criterion: 'Crit B' }),
        ]),
      }),
    );

    // ensure result is the template object from findUnique
    expect(res).toBeDefined();
    expect((res as any).id).toBe('t1');
  });
});
