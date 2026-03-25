import { NotificationsProcessor } from '../notifications.processor';

describe('NotificationsProcessor', () => {
  let processor: NotificationsProcessor;

  const prisma: any = {
    candidateProjects: {
      findUnique: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
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

  it('notifies recruiter and interview coordinators for approved screening and skips trainer coordinatorId', async () => {
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

    expect(notificationsService.createNotification).toHaveBeenCalledTimes(4);
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
    expect(notificationsService.createNotification).not.toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'trainer-1' }),
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
});
