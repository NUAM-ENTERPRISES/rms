import { Test, TestingModule } from '@nestjs/testing';
import { InterviewsService } from '../interviews.service';
import { PrismaService } from '../../database/prisma.service';

describe('InterviewsService - client decision flows', () => {
  let service: InterviewsService;
  let prisma: any;

  const mockPrisma = {
    user: { findUnique: jest.fn() },
    interview: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    interviewStatusHistory: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    candidateProjects: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    candidateProjectSubStatus: {
      findUnique: jest.fn(),
    },
    candidateRecruiterAssignment: {
      findFirst: jest.fn(),
    },
    candidateProjectStatusHistory: {
      create: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(async (callback: any) => callback(mockPrisma)),
  } as any;

  const mockCandidateProjectsService = {
    updateStatus: jest.fn(),
  } as any;

  const mockOutboxService = {
    publishRecruiterNotification: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: (require('../../candidate-projects/candidate-projects.service') as any).CandidateProjectsService, useValue: mockCandidateProjectsService },
        { provide: (require('../../notifications/outbox.service') as any).OutboxService, useValue: mockOutboxService },
      ],
    }).compile();

    service = module.get(InterviewsService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('updateClientDecision creates interviewStatusHistory and notifies recruiter when present', async () => {
    const cpFound = {
      id: 'cpm-1',
      recruiterId: 'rec-1',
      candidateId: 'cand-1',
      candidate: { id: 'cand-1', firstName: 'Jane', lastName: 'Doe' },
      project: { id: 'proj-1', title: 'Project X' },
      mainStatus: { id: 'main-1' },
      subStatus: { id: 'sub-0', name: 'submitted_to_client' },
    };

    const targetSub = { id: 'sub-1', name: 'shortlisted', stageId: 'main-2', stage: { label: 'Shortlist' }, label: 'Shortlisted' };

    mockPrisma.user.findUnique.mockResolvedValue({ name: 'Changer' });
    mockPrisma.candidateProjects.findUnique.mockResolvedValue(cpFound);
    mockPrisma.candidateProjectSubStatus.findUnique.mockResolvedValue(targetSub);
    mockPrisma.candidateRecruiterAssignment.findFirst.mockResolvedValue({ recruiterId: 'rec-1' });
    mockPrisma.candidateProjects.update.mockResolvedValue({ ...cpFound, subStatus: targetSub, mainStatus: targetSub.stage, recruiter: { id: 'rec-1' } });
    mockPrisma.interviewStatusHistory.create.mockResolvedValue({ id: 'hist-1' });
    mockPrisma.candidateProjectStatusHistory.create.mockResolvedValue({ id: 'hist-2' });
    mockOutboxService.publishRecruiterNotification.mockResolvedValue(undefined);

    const res = await service.updateClientDecision('cpm-1', 'shortlisted', 'Good fit', 'user-1');

    expect(mockPrisma.candidateProjects.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'cpm-1' },
      data: expect.objectContaining({
        subStatusId: targetSub.id,
        mainStatusId: targetSub.stageId,
        recruiterId: 'rec-1',
      }),
    }));

    expect(mockPrisma.interviewStatusHistory.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        candidateProjectMapId: 'cpm-1',
        status: 'shortlisted',
        reason: 'Good fit',
      }),
    }));

    expect(mockOutboxService.publishRecruiterNotification).toHaveBeenCalledWith(
      'rec-1',
      expect.stringContaining('Jane Doe'),
      expect.stringContaining('Client decision'),
      expect.stringContaining('/shortlisting/'),
      expect.objectContaining({ candidateProjectMapId: 'cpm-1', candidateId: 'cand-1', projectId: 'proj-1', decision: 'shortlisted' }),
    );

    expect(res).toEqual(expect.objectContaining({ id: 'cpm-1' }));
  });

  it('create interview sets outcome to scheduled', async () => {
    mockPrisma.candidateProjects.findUnique.mockResolvedValueOnce({
      id: 'cpm-1',
      candidateId: 'cand-1',
      projectId: 'proj-1',
    });
    mockPrisma.interview.findFirst.mockResolvedValueOnce(null);
    mockPrisma.user.findUnique.mockResolvedValueOnce({ name: 'Scheduler' });

    const createdInterview = { id: 'i-1', scheduledTime: '2026-03-28T10:00:00.000Z', duration: 60 };
    mockPrisma.interview.create.mockResolvedValueOnce(createdInterview);
    mockPrisma.candidateProjects.findUnique.mockResolvedValueOnce({
      id: 'cpm-1',
      candidateId: 'cand-1',
      projectId: 'proj-1',
      recruiterId: null,
      candidate: { firstName: 'John', lastName: 'Doe' },
      project: { title: 'Project A' },
      mainStatus: { id: 'main-1', label: 'Open' },
      subStatus: { id: 'sub-0', name: 'submitted_to_client', label: 'Submitted' },
    });
    mockPrisma.candidateProjectSubStatus.findUnique.mockResolvedValueOnce({ id: 'sub-1', name: 'interview_scheduled', label: 'Interview Scheduled' });
    mockPrisma.candidateProjects.update.mockResolvedValueOnce({});
    mockPrisma.candidateProjectStatusHistory.create.mockResolvedValueOnce({});
    mockPrisma.interviewStatusHistory.create.mockResolvedValueOnce({});

    const result = await service.create({
      candidateProjectMapId: 'cpm-1',
      scheduledTime: '2026-03-28T10:00:00Z',
      duration: 60,
      type: 'technical',
      mode: 'video',
    } as any, 'user-1');

    expect(mockPrisma.interview.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        outcome: 'scheduled',
        interviewer: 'user-1',
      }),
    }));

    expect(result).toEqual(createdInterview);
  });

  it('getSummaryStats counts interview outcome metrics from interview table', async () => {
    mockPrisma.candidateProjects = {
      count: jest.fn().mockResolvedValue(5),
    };
    mockPrisma.interview = {
      count: jest.fn().mockImplementation(({ where }: any) => {
        if (where.outcome === 'scheduled') return Promise.resolve(11);
        if (where.outcome === 'passed') return Promise.resolve(7);
        if (where.outcome === 'failed') return Promise.resolve(4);
        if (where.outcome === 'backout') return Promise.resolve(3);
        if (where.outcome === 'completed') return Promise.resolve(9);
        return Promise.resolve(0);
      }),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    } as any;
    mockPrisma.screening = {
      count: jest.fn().mockResolvedValue(0),
    };

    const stats = await service.getSummaryStats();
    expect(stats.interviewScheduled).toBe(11);
    expect(stats.interviewPassed).toBe(7);
    expect(stats.interviewRejected).toBe(4);
    expect(stats.interviewBackout).toBe(3);
    expect(stats.interviewCompleted).toBe(9);
    expect(stats.passRate).toBeCloseTo((7 / (7 + 4)) * 100, 2);
  });

  it('findAll with status=failed filters by interview.outcome failed', async () => {
    mockPrisma.interview.findMany.mockResolvedValue([{ id: 'i-1' }]);
    mockPrisma.interview.count.mockResolvedValue(1);
    mockPrisma.candidateProjects = { count: jest.fn() };
    mockPrisma.screening = { count: jest.fn() };

    const result = await service.findAll({ status: 'failed', page: 1, limit: 10 } as any);

    expect(mockPrisma.interview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          outcome: 'failed',
        }),
      }),
    );

    expect(result).toEqual({
      interviews: [{ id: 'i-1' }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
  });

  it('updateBulkClientDecision calls updateClientDecision per item and returns per-item results', async () => {
    const spy = jest.spyOn(service, 'updateClientDecision').mockImplementation(async (id: string, decision: any, notes: any, changedById: any) => {
      return { id, decision, notes } as any;
    });

    const updates = [
      { id: 'cpm-1', decision: 'shortlisted', notes: 'ok' },
      { id: 'cpm-2', decision: 'not_shortlisted', notes: 'no' },
    ];

    const results = await service.updateBulkClientDecision(updates as any, 'user-1');

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith('cpm-1', 'shortlisted', 'ok', 'user-1');
    expect(spy).toHaveBeenCalledWith('cpm-2', 'not_shortlisted', 'no', 'user-1');

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual(expect.objectContaining({ id: 'cpm-1', success: true, data: expect.objectContaining({ id: 'cpm-1' }) }));
    expect(results[1]).toEqual(expect.objectContaining({ id: 'cpm-2', success: true, data: expect.objectContaining({ id: 'cpm-2' }) }));

    spy.mockRestore();
  });
});
