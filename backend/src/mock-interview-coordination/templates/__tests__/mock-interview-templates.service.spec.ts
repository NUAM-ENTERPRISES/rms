import { Test, TestingModule } from '@nestjs/testing';
import { MockInterviewTemplatesService } from '../mock-interview-templates.service';
import { PrismaService } from '../../../database/prisma.service';
import { CreateMockInterviewTemplateDto } from '../dto/create-template.dto';

describe('MockInterviewTemplatesService', () => {
  let service: MockInterviewTemplatesService;
  let prisma: any;

  const mockPrisma = {
    roleCatalog: { findUnique: jest.fn() },
    mockInterviewTemplate: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    mockInterviewTemplateItem: { createMany: jest.fn() },
    $transaction: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MockInterviewTemplatesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(MockInterviewTemplatesService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => jest.clearAllMocks());

  it('allows creating a template with multiple items in the same category', async () => {
    const dto: CreateMockInterviewTemplateDto = {
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
    prisma.mockInterviewTemplate.findUnique.mockResolvedValueOnce(null);

    // simulate transaction behavior
    const tx = {
      mockInterviewTemplate: {
        create: jest.fn().mockResolvedValue({ id: 't1' }),
        findUnique: jest.fn().mockResolvedValue({ id: 't1', name: 'Template A' }),
      },
      mockInterviewTemplateItem: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
    } as any;

    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    // execute create
    const res = await service.create(dto);

    // transaction should be called
    expect(prisma.$transaction).toHaveBeenCalled();

    // ensure createMany was called and allowed duplicate categories
    expect(tx.mockInterviewTemplateItem.createMany).toHaveBeenCalledWith(
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
