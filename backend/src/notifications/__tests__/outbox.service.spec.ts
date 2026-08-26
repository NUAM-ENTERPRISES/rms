import { OutboxService } from '../outbox.service';

describe('OutboxService.notifyOwnerRecruiterOfAction', () => {
  const prisma = {
    outboxEvent: {
      create: jest.fn().mockResolvedValue({ id: 'evt-1' }),
    },
  };

  let service: OutboxService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OutboxService(prisma as any);
  });

  it('publishes RecruiterNotification when actor is not the owner', async () => {
    const published = await service.notifyOwnerRecruiterOfAction({
      ownerRecruiterId: 'recruiter-1',
      actorUserId: 'manager-1',
      title: 'Assigned to project',
      message: 'Ada Manager assigned Jane Doe to project "Gulf RN".',
      link: '/recruiter-docs/proj-1/cand-1',
      meta: {
        type: 'candidate_assigned_to_project',
        candidateId: 'cand-1',
        projectId: 'proj-1',
        actorUserId: 'manager-1',
        actorName: 'Ada Manager',
      },
    });

    expect(published).toBe(true);
    expect(prisma.outboxEvent.create).toHaveBeenCalledWith({
      data: {
        type: 'RecruiterNotification',
        payload: {
          recruiterId: 'recruiter-1',
          message: 'Ada Manager assigned Jane Doe to project "Gulf RN".',
          title: 'Assigned to project',
          link: '/recruiter-docs/proj-1/cand-1',
          meta: {
            type: 'candidate_assigned_to_project',
            candidateId: 'cand-1',
            projectId: 'proj-1',
            actorUserId: 'manager-1',
            actorName: 'Ada Manager',
          },
        },
      },
    });
  });

  it('skips when the actor is the owner recruiter', async () => {
    const published = await service.notifyOwnerRecruiterOfAction({
      ownerRecruiterId: 'recruiter-1',
      actorUserId: 'recruiter-1',
      title: 'Document uploaded',
      message: 'Self upload',
    });

    expect(published).toBe(false);
    expect(prisma.outboxEvent.create).not.toHaveBeenCalled();
  });

  it('skips when owner recruiter is missing', async () => {
    const published = await service.notifyOwnerRecruiterOfAction({
      ownerRecruiterId: null,
      actorUserId: 'manager-1',
      title: 'Sent for verification',
      message: 'No owner',
    });

    expect(published).toBe(false);
    expect(prisma.outboxEvent.create).not.toHaveBeenCalled();
  });
});
