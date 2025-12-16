import { Test, TestingModule } from '@nestjs/testing';
import { TrainingService } from '../training.service';
import { PrismaService } from '../../../database/prisma.service';
import { CreateTrainingAssignmentDto } from '../dto/create-training.dto';
import { CandidateProjectsService } from '../../../candidate-projects/candidate-projects.service';

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
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    trainingSession: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    candidateProjectStatusHistory: { create: jest.fn() },
    interviewStatusHistory: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  } as any;

  beforeEach(async () => {
    const mockCandidateProjectsService = { sendForInterview: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CandidateProjectsService, useValue: mockCandidateProjectsService },
      ],
    }).compile();

    service = module.get(TrainingService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => jest.resetAllMocks());

  it('sendForInterview delegates and updates training assignment status', async () => {
    const mockCandidateProject = { id: 'map1', candidate: { firstName: 'John' }, project: { id: 'p1' } };
    const dto = { projectId: 'p1', candidateId: 'c1', type: 'mock_interview_assigned' } as any;

    // get mocked candidateProjectsService from module
    const mockCandidateProjectsService = (service as any).candidateProjectsService as any;
    mockCandidateProjectsService.sendForInterview = jest.fn().mockResolvedValue(mockCandidateProject);

    (prisma.trainingAssignment.updateMany as any).mockResolvedValue({ count: 1 });
    (prisma.candidateProjects.findUnique as any).mockResolvedValue(mockCandidateProject);
    (prisma.interviewStatusHistory.findMany as any).mockResolvedValue([{ id: 'hist1', interviewType: 'mock', status: 'assigned' }]);

    // ensure count returns 0 to test safety create branch
    (prisma.interviewStatusHistory.count as any).mockResolvedValue(0);
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', name: 'Alice' });
    (prisma.interviewStatusHistory.create as any).mockResolvedValue({ id: 'hist1' });

    const res: any = await service.sendForInterview(dto, 'u1');

    expect(mockCandidateProjectsService.sendForInterview).toHaveBeenCalledWith(dto, 'u1');
    expect(prisma.trainingAssignment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ candidateProjectMapId: 'map1' }),
      data: { status: 'mock_assigned' },
    }));
    expect(res.id).toBe('map1');
    expect(res.history).toBeDefined();
    expect(res.history[0].status).toBe('assigned');
    // When there was no existing history, ensure we created one
    expect(prisma.interviewStatusHistory.create).toHaveBeenCalled();
  });

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

  it('findAllAssignments excludes basic training without mockInterview by default', async () => {
    (prisma.trainingAssignment.findMany as any).mockResolvedValue([]);

    await (service as any).findAllAssignments({} as any);

    expect(prisma.trainingAssignment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ NOT: { trainingType: 'basic', mockInterviewId: null } }) }));
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

  it('getTrainingHistory returns paginated training history', async () => {
    const cpId = 'cp1';
    (prisma.candidateProjects.findUnique as any).mockResolvedValue({ id: cpId });
    const mockItems = [ { id: 'h1', interviewType: 'training', status: 'assigned' } ];
    (prisma.interviewStatusHistory.findMany as any) = jest.fn().mockResolvedValue(mockItems);
    (prisma.interviewStatusHistory.count as any) = jest.fn().mockResolvedValue(1);

    const res: any = await (service as any).getTrainingHistory(cpId, { page: 1, limit: 10 });
    expect(prisma.candidateProjects.findUnique).toHaveBeenCalledWith({ where: { id: cpId } });
    expect(prisma.interviewStatusHistory.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ candidateProjectMapId: cpId, OR: expect.arrayContaining([ expect.objectContaining({ interviewType: 'training' }), expect.objectContaining({ interviewId: null }) ]) }) }));
    expect(res.items).toEqual(mockItems);
    expect(res.total).toBe(1);
  });
});
