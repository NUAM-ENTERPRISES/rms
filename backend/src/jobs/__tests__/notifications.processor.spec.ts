import { NotificationsProcessor } from '../notifications.processor';

describe('NotificationsProcessor', () => {
  let processor: NotificationsProcessor;

  const prisma: any = {
    candidateProjects: {
      findUnique: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const notificationsService: any = {
    createNotification: jest.fn(),
  };

  const notificationsGateway: any = {
    emitToUser: jest.fn(),
  };

  const whatsappNotificationService: any = {
    sendScreeningScheduled: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new NotificationsProcessor(
      prisma as any,
      notificationsService as any,
      notificationsGateway as any,
      whatsappNotificationService as any,
    );
  });

  it('notifies coordinator, recruiter, and interview coordinators for approved screening', async () => {
    const job: any = {
      data: {
        eventId: 'event-1',
        payload: {
          candidateProjectMapId: 'cpm-1',
          screeningId: 'screening-1',
          coordinatorId: 'trainer-1',
          recruiterId: 'recruiter-1',
          teamHeadId: 'teamHead-1',
        },
      },
    };

    prisma.candidateProjects.findUnique.mockResolvedValue({
      candidate: { id: 'cand-1', firstName: 'John', lastName: 'Doe' },
      project: { id: 'proj-1', title: 'Project X' },
      roleNeeded: { designation: 'Backend' },
    });
    prisma.user.findMany.mockResolvedValue([{ id: 'ic-1' }, { id: 'ic-2' }]);

    await processor.handleCandidateApprovedForClientInterview(job);

    expect(notificationsService.createNotification).toHaveBeenCalledTimes(9);
    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'trainer-1', type: 'screening_passed' }),
    );
    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'recruiter-1', type: 'screening_passed' }),
    );
    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'ic-1', type: 'screening_passed' }),
    );
    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'ic-2', type: 'screening_passed' }),
    );
    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'teamHead-1', type: 'screening_passed' }),
    );
  });

  it('notifies recruiter and interview coordinators for failed screening and skips trainer coordinatorId', async () => {
    const job: any = {
      data: {
        eventId: 'event-2',
        payload: {
          candidateProjectMapId: 'cpm-2',
          screeningId: 'screening-2',
          coordinatorId: 'trainer-2',
          recruiterId: 'recruiter-2',
          decision: 'rejected',
          teamHeadId: 'teamHead-2',
        },
      },
    };

    prisma.candidateProjects.findUnique.mockResolvedValue({
      candidate: { id: 'cand-2', firstName: 'Jane', lastName: 'Smith' },
      project: { id: 'proj-2', title: 'Project Y' },
      roleNeeded: { designation: 'Frontend' },
    });
    prisma.user.findMany.mockResolvedValue([{ id: 'ic-3' }, { id: 'ic-4' }]);

    await processor.handleCandidateFailedScreening(job);

    expect(notificationsService.createNotification).toHaveBeenCalledTimes(4);
    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'recruiter-2', type: 'candidate_failed_screening' }),
    );
    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'teamHead-2', type: 'candidate_failed_screening' }),
    );
    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'ic-3', type: 'candidate_failed_screening' }),
    );
    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'ic-4', type: 'candidate_failed_screening' }),
    );
    expect(notificationsService.createNotification).not.toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'trainer-2' }),
    );
  });

  it('notifies only agent coordinators for agent candidate requests', async () => {
    const job: any = {
      data: {
        eventId: 'event-agent-1',
        payload: {
          requestId: 'req-1',
          projectId: 'project-1',
          projectTitle: 'Saudi MOH Nurses',
          requestedById: 'manager-1',
          items: [
            {
              roleNeededId: 'role-1',
              requestedCount: 2,
              roleDesignation: 'Emergency Staff Nurse',
            },
          ],
          notes: 'Need urgent profiles',
        },
      },
    };

    prisma.user.findUnique.mockResolvedValue({ name: 'Manager One' });
    prisma.user.findMany.mockResolvedValue([{ id: 'ac-1' }, { id: 'ac-2' }]);

    await processor.handleAgentCandidateRequestCreated(job);

    expect(notificationsService.createNotification).toHaveBeenCalledTimes(2);
    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'ac-1',
        type: 'agent_candidate_request_created',
        link: '/projects/project-1',
      }),
    );
    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'ac-2',
        type: 'agent_candidate_request_created',
      }),
    );
  });

  it('notifies recruiter, admin roles, and processing roles for offer letter upload and excludes uploader', async () => {
    const job: any = {
      data: {
        eventId: 'event-offer-1',
        payload: {
          candidateId: 'cand-1',
          projectId: 'proj-1',
          candidateProjectMapId: 'cpm-1',
          documentId: 'doc-1',
          recruiterId: 'recruiter-1',
          candidateName: 'John Doe',
          projectTitle: 'Project X',
          roleDesignation: 'Nurse',
          uploadedBy: 'uploader-1',
          uploadedByName: 'IC User',
        },
      },
    };

    prisma.user.findMany.mockResolvedValue([
      { id: 'admin-1' },
      { id: 'rm-1' },
      { id: 'mgr-1' },
      { id: 'ic-1' },
      { id: 'pm-1' },
      { id: 'pe-1' },
      { id: 'uploader-1' },
    ]);

    await processor.handleOfferLetterUploaded(job);

    expect(notificationsService.createNotification).toHaveBeenCalledTimes(7);
    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'recruiter-1',
        type: 'offer_letter_uploaded',
        link: '/candidates/cand-1',
        meta: expect.objectContaining({
          candidateId: 'cand-1',
          projectId: 'proj-1',
          syncTags: ['Interview', 'ProcessingSummary', 'Candidate', 'Document'],
        }),
      }),
    );
    expect(notificationsService.createNotification).not.toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'uploader-1' }),
    );
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userRoles: {
            some: {
              role: {
                name: {
                  in: expect.arrayContaining([
                    'Admin',
                    'System Admin',
                    'Recruiter Manager',
                    'Manager',
                    'Interview Coordinator',
                    'Processing Manager',
                    'Processing Executive',
                  ]),
                },
              },
            },
          },
        }),
      }),
    );
  });
});
