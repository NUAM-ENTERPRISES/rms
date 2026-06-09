import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { InterviewsService } from '../interviews.service';
import { PrismaService } from '../../database/prisma.service';
import { ROLE_NAMES } from '../../common/constants/role-ids';

describe('InterviewsService - client decision flows', () => {
  let service: InterviewsService;
  let prisma: any;

  const mockPrisma = {
    user: { findUnique: jest.fn() },
    interview: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    interviewStatusHistory: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    candidateProjects: {
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    screeningTraining: { create: jest.fn() },
    candidateProjectSubStatus: {
      findUnique: jest.fn(),
    },
    candidateRecruiterAssignment: {
      findFirst: jest.fn(),
    },
    candidateProjectStatusHistory: {
      create: jest.fn(),
    },
    documentForwardHistory: {
      findFirst: jest.fn(),
    },
    candidateProjectDocumentVerification: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(async (callback: any) => callback(mockPrisma)),
  } as any;

  const mockCandidateProjectsService = {
    updateStatus: jest.fn(),
  } as any;

  const mockOutboxService = {
    publishRecruiterNotification: jest.fn(),
    publishEvent: jest.fn(),
  } as any;

  const mockDocumentsService = {
    requestOfferLetterUploadAfterSendForProcessing: jest.fn(),
  } as any;

  beforeEach(async () => {
    mockPrisma.interview = {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    };
    mockPrisma.candidateProjects = {
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    };
    mockPrisma.interviewStatusHistory = {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: (require('../../candidate-projects/candidate-projects.service') as any).CandidateProjectsService, useValue: mockCandidateProjectsService },
        { provide: (require('../../notifications/outbox.service') as any).OutboxService, useValue: mockOutboxService },
        { provide: (require('../../documents/documents.service') as any).DocumentsService, useValue: mockDocumentsService },
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
      expect.stringContaining('/candidates/cand-1'),
      expect.objectContaining({ candidateProjectMapId: 'cpm-1', candidateId: 'cand-1', projectId: 'proj-1', decision: 'shortlisted' }),
    );

    expect(res).toEqual(expect.objectContaining({ id: 'cpm-1' }));
  });

  it('getNotShortlisted includes notShortlistedReason from projectStatusHistory', async () => {
    mockPrisma.candidateProjects.count.mockResolvedValue(1);
    mockPrisma.candidateProjects.findMany.mockResolvedValue([
      {
        id: 'cpm-2',
        candidate: { id: 'cand-2', firstName: 'Test', lastName: 'User' },
        project: { id: 'proj-2', title: 'Test Project' },
        roleNeeded: { id: 'role-2', designation: 'Test Role' },
        recruiter: { id: 'rec-2', name: 'Recruiter 2', email: 'rec2@example.com' },
        mainStatus: { id: 'main-2' },
        subStatus: { id: 'sub-2', name: 'not_shortlisted', label: 'Not Shortlisted' },
        updatedAt: new Date().toISOString(),
        projectStatusHistory: [
          { reason: 'Not a fit', notes: 'No match', statusChangedAt: new Date().toISOString() },
        ],
      },
    ]);
    mockPrisma.documentForwardHistory.findFirst.mockResolvedValue(null);

    const result = await service.getNotShortlisted({ page: 1, limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toHaveProperty('notShortlistedReason', 'Not a fit');
    expect(result.pagination.total).toBe(1);
  });

  it('getInterviewHistory includes candidateProjectMap shortlist events for client interview', async () => {
    mockPrisma.interview.findUnique.mockResolvedValueOnce({ id: 'i-1', candidateProjectMapId: 'cpm-1' });
    mockPrisma.interviewStatusHistory.count.mockResolvedValueOnce(2);
    mockPrisma.interviewStatusHistory.findMany.mockResolvedValueOnce([
      {
        id: 'hist-1',
        interviewType: 'client',
        interviewId: 'i-1',
        candidateProjectMapId: 'cpm-1',
        status: 'assigned',
        statusSnapshot: 'Interview Assigned',
        statusAt: new Date().toISOString(),
        changedBy: { id: 'user-1', name: 'Admin', email: 'admin@example.com' },
        reason: 'Interview scheduled',
      },
      {
        id: 'hist-2',
        interviewType: 'client',
        interviewId: null,
        candidateProjectMapId: 'cpm-1',
        status: 'shortlisted',
        statusSnapshot: 'Shortlisted',
        statusAt: new Date().toISOString(),
        changedBy: { id: 'user-1', name: 'Admin', email: 'admin@example.com' },
        reason: 'Client shortlisted candidate',
      },
    ]);

    const result = (await service.getInterviewHistory('i-1', { page: 1, limit: 10 })) as any;

    expect(mockPrisma.interviewStatusHistory.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: expect.arrayContaining([
          expect.objectContaining({ interviewId: 'i-1' }),
          expect.objectContaining({ candidateProjectMapId: 'cpm-1' }),
        ]),
      }),
    }));
    expect(result.items).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
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
      mode: 'video',
    } as any, 'user-1');

    expect(mockPrisma.interview.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        outcome: 'scheduled',
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
      interviews: [
        expect.objectContaining({
          id: 'i-1',
          offerLetterData: null,
          isOfferLetterUploaded: false,
        }),
      ],
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

  it('updateInterviewStatus does not publish CandidateReadyForProcessing when interview is passed', async () => {
    const interview = {
      id: 'int-1',
      candidateProjectMapId: 'cpm-1',
      notes: null,
    };

    const updatedInterview = {
      ...interview,
      outcome: 'passed',
      candidateProjectMap: {
        id: 'cpm-1',
        recruiter: { id: 'rec-1', name: 'Recruiter' },
        candidate: { id: 'cand-1', firstName: 'Jane', lastName: 'Doe' },
        project: { id: 'proj-1', title: 'Project X' },
      },
      project: { id: 'proj-1', title: 'Project X' },
    };

    mockPrisma.interview.findUnique.mockResolvedValue(interview);
    mockPrisma.user.findUnique.mockResolvedValue({ name: 'Coordinator' });
    mockPrisma.interview.update.mockResolvedValue(updatedInterview);
    mockPrisma.candidateProjects.findUnique.mockResolvedValue({
      id: 'cpm-1',
      mainStatus: { id: 'main-1' },
      subStatus: { id: 'sub-0', name: 'interview_completed' },
    });
    mockPrisma.candidateProjectSubStatus.findUnique.mockResolvedValue({
      id: 'sub-passed',
      name: 'interview_passed',
      label: 'Interview Passed',
    });
    mockPrisma.interviewStatusHistory.create.mockResolvedValue({ id: 'hist-1' });
    mockPrisma.candidateProjectStatusHistory.create.mockResolvedValue({ id: 'hist-2' });
    mockOutboxService.publishRecruiterNotification.mockResolvedValue(undefined);

    await service.updateInterviewStatus(
      'int-1',
      { interviewStatus: 'passed', subStatus: 'interview_passed' },
      'user-1',
    );

    expect(mockOutboxService.publishRecruiterNotification).toHaveBeenCalled();
    expect(mockOutboxService.publishEvent).not.toHaveBeenCalled();
  });

  it('sendForProcessing sets readyForProcessingAt and publishes CandidateReadyForProcessing', async () => {
    const interview = {
      id: 'int-1',
      outcome: 'passed',
      readyForProcessingAt: null,
      candidateProjectMapId: 'cpm-1',
      candidateProjectMap: {
        candidate: { id: 'cand-1', firstName: 'Jane', lastName: 'Doe' },
        project: { id: 'proj-1', title: 'Project X' },
        recruiter: { id: 'rec-1', name: 'Recruiter One' },
        roleNeeded: { roleCatalogId: 'rc-1', roleCatalog: { id: 'rc-1' } },
      },
      project: { id: 'proj-1', title: 'Project X' },
    };

    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        userRoles: [{ role: { name: ROLE_NAMES.INTERVIEW_COORDINATOR } }],
      })
      .mockResolvedValueOnce({ name: 'Coordinator' });
    mockPrisma.interview.findUnique.mockResolvedValue(interview);
    mockPrisma.interview.findFirst.mockResolvedValue(null);
    mockPrisma.candidateProjectDocumentVerification.findFirst.mockResolvedValue(null);
    mockPrisma.interview.update.mockResolvedValue({
      ...interview,
      readyForProcessingAt: new Date('2026-06-07T00:00:00.000Z'),
      candidateProjectMap: {
        candidate: { id: 'cand-1', firstName: 'Jane', lastName: 'Doe' },
        project: { id: 'proj-1', title: 'Project X' },
        roleNeeded: { designation: 'Nurse', roleCatalog: { id: 'rc-1' } },
        recruiter: { id: 'rec-1' },
        mainStatus: null,
        subStatus: null,
        documentVerifications: [],
      },
      project: { id: 'proj-1', title: 'Project X' },
    });

    const result = await service.sendForProcessing('int-1', 'coord-1');

    expect(mockPrisma.interview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'int-1' },
        data: expect.objectContaining({
          readyForProcessingById: 'coord-1',
          readyForProcessingAt: expect.any(Date),
        }),
      }),
    );
    expect(mockOutboxService.publishEvent).toHaveBeenCalledWith(
      'CandidateReadyForProcessing',
      expect.objectContaining({
        candidateProjectMapId: 'cpm-1',
        candidateName: 'Jane Doe',
        projectName: 'Project X',
      }),
      expect.anything(),
    );
    expect(
      mockDocumentsService.requestOfferLetterUploadAfterSendForProcessing,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateProjectMapId: 'cpm-1',
        candidateId: 'cand-1',
        projectId: 'proj-1',
        recruiterId: 'rec-1',
        roleCatalogId: 'rc-1',
      }),
      expect.anything(),
    );
    expect(result).toEqual(expect.objectContaining({ id: 'int-1' }));
  });

  it('sendForProcessing skips recruiter offer letter request when offer letter exists', async () => {
    const interview = {
      id: 'int-2',
      outcome: 'passed',
      readyForProcessingAt: null,
      candidateProjectMapId: 'cpm-2',
      candidateProjectMap: {
        candidate: { id: 'cand-2', firstName: 'John', lastName: 'Smith' },
        project: { id: 'proj-2', title: 'Project Y' },
        recruiter: { id: 'rec-2' },
        roleNeeded: { roleCatalogId: 'rc-2', roleCatalog: { id: 'rc-2' } },
      },
      project: { id: 'proj-2', title: 'Project Y' },
    };

    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        userRoles: [{ role: { name: ROLE_NAMES.INTERVIEW_COORDINATOR } }],
      })
      .mockResolvedValueOnce({ name: 'Coordinator' });
    mockPrisma.interview.findUnique.mockResolvedValue(interview);
    mockPrisma.interview.findFirst.mockResolvedValue(null);
    mockPrisma.candidateProjectDocumentVerification.findFirst.mockResolvedValue({
      id: 'ver-1',
    });
    mockPrisma.interview.update.mockResolvedValue({
      ...interview,
      readyForProcessingAt: new Date(),
      candidateProjectMap: interview.candidateProjectMap,
      project: interview.project,
    });

    await service.sendForProcessing('int-2', 'coord-1');

    expect(
      mockDocumentsService.requestOfferLetterUploadAfterSendForProcessing,
    ).not.toHaveBeenCalled();
  });

  it('sendForProcessing rejects when candidate already sent on another project', async () => {
    const interview = {
      id: 'int-b',
      outcome: 'passed',
      readyForProcessingAt: null,
      candidateProjectMapId: 'cpm-b',
      candidateProjectMap: {
        candidate: { id: 'cand-1', firstName: 'Hari', lastName: 'KL' },
        project: { id: 'proj-b', title: 'Project B' },
        recruiter: { id: 'rec-1' },
        roleNeeded: { roleCatalogId: 'rc-b', roleCatalog: { id: 'rc-b' } },
      },
      project: { id: 'proj-b', title: 'Project B' },
    };

    mockPrisma.user.findUnique.mockResolvedValue({
      userRoles: [{ role: { name: ROLE_NAMES.INTERVIEW_COORDINATOR } }],
    });
    mockPrisma.interview.findUnique.mockResolvedValue(interview);
    mockPrisma.interview.findFirst.mockResolvedValue({
      id: 'int-a',
      readyForProcessingAt: new Date('2026-06-07T00:00:00.000Z'),
      project: { title: 'Project A' },
      candidateProjectMap: { project: { title: 'Project A' } },
    });
    mockPrisma.candidateProjectDocumentVerification.findFirst.mockResolvedValue(null);

    await expect(service.sendForProcessing('int-b', 'coord-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(mockPrisma.interview.update).not.toHaveBeenCalled();
  });

  it('sendForProcessing rejects non Interview Coordinator users', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      userRoles: [{ role: { name: 'Recruiter' } }],
    });

    await expect(service.sendForProcessing('int-1', 'rec-1')).rejects.toThrow(
      ForbiddenException,
    );
  });
});
