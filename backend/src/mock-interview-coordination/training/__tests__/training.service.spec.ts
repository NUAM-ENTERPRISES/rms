import { Test, TestingModule } from '@nestjs/testing';
import { TrainingService } from '../training.service';
import { PrismaService } from '../../../database/prisma.service';
import { CreateTrainingAssignmentDto } from '../dto/create-training.dto';

describe('TrainingService', () => {
  let service: TrainingService;
  let prisma: any;

  const mockPrisma = {
    candidateProjects: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    mockInterview: { findUnique: jest.fn() },
    trainingAssignment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    trainingSession: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    candidateProjectStatusHistory: { create: jest.fn() },
    $transaction: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrainingService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get(TrainingService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => jest.resetAllMocks());

  it('createAssignment returns assignment including assignedBy user info', async () => {
    const dto = { candidateProjectMapId: 'map1', assignedBy: 'u1' } as CreateTrainingAssignmentDto;

    (prisma.candidateProjects.findUnique as any).mockResolvedValue({ id: 'map1' });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', name: 'Assigner' });

    const tx = {
      trainingAssignment: { create: jest.fn().mockResolvedValue({ id: 'ta1', assignedBy: 'u1', candidateProjectMap: { candidate: { firstName: 'John', lastName: 'Doe', email: 'john@example.com', countryCode: '+91', mobileNumber: '9876543210' } } }) },
      candidateProjects: { update: jest.fn().mockResolvedValue({ id: 'map1' }) },
      candidateProjectStatusHistory: { create: jest.fn().mockResolvedValue({ id: 'hist1' }) },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', name: 'Assigner' }) },
    } as any;

    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    // Ensure after create we fetch assignment (the create returns the created object via tx)
    (prisma.trainingAssignment.findUnique as any).mockResolvedValueOnce({ id: 'ta1', assignedBy: 'u1', candidateProjectMap: { candidate: { firstName: 'John', lastName: 'Doe', email: 'john@example.com', countryCode: '+91', mobileNumber: '9876543210' } } });

    const res = await service.createAssignment(dto);

    expect(tx.trainingAssignment.create).toHaveBeenCalled();
    expect(res).toBeDefined();
    expect(res.candidateProjectMap).toBeDefined();
    expect(res.candidateProjectMap.candidate).toBeDefined();
    expect(res.candidateProjectMap.candidate!.email).toBe('john@example.com');
    expect(res.candidateProjectMap.candidate!.phone).toBe('+91 9876543210');
  });

  it('findAllAssignments includes assignedBy object', async () => {
    (prisma.trainingAssignment.findMany as any).mockResolvedValue([
      { id: 'ta1', assignedBy: 'u1', candidateProjectMap: { candidate: { firstName: 'John', lastName: 'Doe', email: 'john@example.com', countryCode: '+91', mobileNumber: '9876543210' } } },
    ]);
    (prisma.user.findMany as any).mockResolvedValue([
      { id: 'u1', name: 'Assigner', email: 'a@x' },
    ]);

    const res: any = await (service as any).findAllAssignments({} as any);

    expect(prisma.trainingAssignment.findMany).toHaveBeenCalled();
    expect(res[0].assignedBy).toBeDefined();
    expect(res[0].assignedBy.name).toBe('Assigner');
    expect(res[0].candidateProjectMap.candidate!.email).toBe('john@example.com');
    expect(res[0].candidateProjectMap.candidate!.phone).toBe('+91 9876543210');
  });

  it('findOneAssignment includes assignedBy object', async () => {
    (prisma.trainingAssignment.findUnique as any).mockResolvedValue({ id: 'ta1', assignedBy: 'u1', candidateProjectMap: { candidate: { firstName: 'John', lastName: 'Doe', email: 'john@example.com', countryCode: '+91', mobileNumber: '9876543210' } } });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', name: 'Assigner', email: 'a@x' });

    const res: any = await (service as any).findOneAssignment('ta1');

    expect(prisma.trainingAssignment.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'ta1' } }));
    expect(res.assignedBy).toBeDefined();
    expect(res.assignedBy.name).toBe('Assigner');
    expect(res.candidateProjectMap.candidate!.email).toBe('john@example.com');
    expect(res.candidateProjectMap.candidate!.phone).toBe('+91 9876543210');
  });
});
