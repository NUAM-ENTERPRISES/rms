import { Test, TestingModule } from '@nestjs/testing';
import { InterviewsService } from '../interviews.service';
import { PrismaService } from '../../database/prisma.service';

describe('InterviewsService - client decision flows', () => {
  let service: InterviewsService;
  let prisma: any;

  const mockPrisma = {
    user: { findUnique: jest.fn() },
    interviewStatusHistory: { create: jest.fn() },
    auditLog: { create: jest.fn() },
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
    const updatedMap = {
      id: 'cpm-1',
      recruiter: { id: 'rec-1' },
      candidate: { id: 'cand-1', firstName: 'Jane', lastName: 'Doe' },
      project: { id: 'proj-1', title: 'Project X' },
    };

    mockCandidateProjectsService.updateStatus.mockResolvedValue(updatedMap);
    mockPrisma.user.findUnique.mockResolvedValue({ name: 'Changer' });
    mockPrisma.interviewStatusHistory.create.mockResolvedValue({ id: 'hist-1' });
    mockOutboxService.publishRecruiterNotification.mockResolvedValue(undefined);

    const res = await service.updateClientDecision('cpm-1', 'shortlisted', 'Good fit', 'user-1');

    expect(mockCandidateProjectsService.updateStatus).toHaveBeenCalledWith('cpm-1', expect.objectContaining({ subStatusName: 'shortlisted' }), 'user-1');

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
      expect.objectContaining({ candidateProjectMapId: 'cpm-1', decision: 'shortlisted' }),
    );

    expect(res).toEqual(updatedMap);
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
