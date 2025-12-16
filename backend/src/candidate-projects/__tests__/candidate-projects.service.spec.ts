import { Test, TestingModule } from '@nestjs/testing';
import { CandidateProjectsService } from '../candidate-projects.service';
import { PrismaService } from '../../database/prisma.service';
import { SendForInterviewDto } from '../dto/send-for-interview.dto';

describe('CandidateProjectsService - sendForInterview', () => {
  let service: CandidateProjectsService;
  let prisma: any;

  const mockPrisma = {
    candidate: { findUnique: jest.fn() },
    project: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    candidateProjectMainStatus: { findUnique: jest.fn() },
    candidateProjectSubStatus: { findUnique: jest.fn() },
    candidateProjects: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    candidateProjectStatusHistory: { create: jest.fn() },
    interviewStatusHistory: { create: jest.fn() },
    trainingAssignment: { create: jest.fn() },
    $transaction: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateProjectsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: (require('../../notifications/notifications.service') as any).NotificationsService, useValue: { send: jest.fn() } },
        { provide: (require('../../notifications/outbox.service') as any).OutboxService, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    service = module.get(CandidateProjectsService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => jest.resetAllMocks());

  it('creates interviewStatusHistory when assigning mock interview', async () => {
    const dto = { projectId: 'p1', candidateId: 'c1', type: 'mock_interview_assigned', notes: 'note' } as SendForInterviewDto;

    (prisma.candidate.findUnique as any).mockResolvedValue({ id: 'c1', firstName: 'A' });
    (prisma.project.findUnique as any).mockResolvedValue({ id: 'p1', title: 'P' });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', name: 'User 1' });
    (prisma.candidateProjectMainStatus.findUnique as any).mockResolvedValue({ id: 'ms1', label: 'Interview' });
    (prisma.candidateProjectSubStatus.findUnique as any).mockResolvedValue({ id: 'ss1', label: 'Mock Interview Assigned' });

    const existing = { id: 'map1', candidate: { firstName: 'A' }, project: { id: 'p1' } };

    const tx = {
      candidateProjects: {
        update: jest.fn().mockResolvedValue(existing),
        create: jest.fn().mockResolvedValue(existing),
      },
      candidateProjectStatusHistory: { create: jest.fn() },
      interviewStatusHistory: { create: jest.fn() },
      trainingAssignment: { create: jest.fn() },
    } as any;

    prisma.candidateProjects.findFirst.mockResolvedValue(existing);
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await service.sendForInterview(dto, 'u1');

    expect(tx.interviewStatusHistory.create).toHaveBeenCalled();
    expect(tx.interviewStatusHistory.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ interviewType: 'mock', status: 'assigned' }) }));
  });

  it('creates interviewStatusHistory when assigning client interview', async () => {
    const dto = { projectId: 'p1', candidateId: 'c1', type: 'interview_assigned', notes: 'note' } as SendForInterviewDto;

    (prisma.candidate.findUnique as any).mockResolvedValue({ id: 'c1', firstName: 'A' });
    (prisma.project.findUnique as any).mockResolvedValue({ id: 'p1', title: 'P' });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', name: 'User 1' });
    (prisma.candidateProjectMainStatus.findUnique as any).mockResolvedValue({ id: 'ms1', label: 'Interview' });
    (prisma.candidateProjectSubStatus.findUnique as any).mockResolvedValue({ id: 'ss2', label: 'Client Interview Assigned' });

    const existing = { id: 'map1', candidate: { firstName: 'A' }, project: { id: 'p1' } };

    const tx = {
      candidateProjects: {
        update: jest.fn().mockResolvedValue(existing),
        create: jest.fn().mockResolvedValue(existing),
      },
      candidateProjectStatusHistory: { create: jest.fn() },
      interviewStatusHistory: { create: jest.fn() },
      trainingAssignment: { create: jest.fn() },
    } as any;

    prisma.candidateProjects.findFirst.mockResolvedValue(existing);
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await service.sendForInterview(dto, 'u1');

    expect(tx.interviewStatusHistory.create).toHaveBeenCalled();
    expect(tx.interviewStatusHistory.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ interviewType: 'client', status: 'assigned' }) }));
  });
});
