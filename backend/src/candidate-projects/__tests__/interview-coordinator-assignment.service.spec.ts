import { BadRequestException } from '@nestjs/common';
import { InterviewCoordinatorAssignmentService } from '../interview-coordinator-assignment.service';
import { PrismaService } from '../../database/prisma.service';

describe('InterviewCoordinatorAssignmentService', () => {
  let service: InterviewCoordinatorAssignmentService;
  const prisma = {
    user: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn() },
    candidateProjects: {
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InterviewCoordinatorAssignmentService(prisma);
  });

  it('picks the Interview Coordinator with the least pending workload', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'ic-a',
        name: 'Alice',
        email: 'alice@example.com',
        assignedInterviewCoordinatorCandidateProjects: Array.from(
          { length: 10 },
          (_, i) => ({ id: `a-${i}` }),
        ),
      },
      {
        id: 'ic-b',
        name: 'Bob',
        email: 'bob@example.com',
        assignedInterviewCoordinatorCandidateProjects: Array.from(
          { length: 5 },
          (_, i) => ({ id: `b-${i}` }),
        ),
      },
    ]);

    const result = await service.getCoordinatorWithLeastPendingWorkload();

    expect(result).toEqual({
      id: 'ic-b',
      name: 'Bob',
      email: 'bob@example.com',
      pendingCount: 5,
    });
  });

  it('tie-breaks equal workload by user id ascending', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'z-ic',
        name: 'Zed',
        email: 'zed@example.com',
        assignedInterviewCoordinatorCandidateProjects: [{ id: 'z-1' }],
      },
      {
        id: 'a-ic',
        name: 'Ann',
        email: 'ann@example.com',
        assignedInterviewCoordinatorCandidateProjects: [{ id: 'a-1' }],
      },
    ]);

    const result = await service.getCoordinatorWithLeastPendingWorkload();
    expect(result.id).toBe('a-ic');
  });

  it('throws when no active Interview Coordinator exists', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

    await expect(
      service.getCoordinatorWithLeastPendingWorkload(),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('keeps the existing assignee on re-assign', async () => {
    (prisma.candidateProjects.findUnique as jest.Mock).mockResolvedValue({
      assignedInterviewCoordinatorId: 'ic-b',
      assignedInterviewCoordinator: {
        id: 'ic-b',
        name: 'Bob',
        email: 'bob@example.com',
      },
    });
    (prisma.candidateProjects.count as jest.Mock).mockResolvedValue(6);

    const result = await service.assignInterviewCoordinator('map-1');

    expect(result.id).toBe('ic-b');
    expect(prisma.candidateProjects.update).not.toHaveBeenCalled();
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('uses preferred coordinator when valid and unset', async () => {
    (prisma.candidateProjects.findUnique as jest.Mock).mockResolvedValue({
      assignedInterviewCoordinatorId: null,
      assignedInterviewCoordinator: null,
    });
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'ic-pref' });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'ic-pref',
      name: 'Preferred',
      email: 'pref@example.com',
    });
    (prisma.candidateProjects.count as jest.Mock).mockResolvedValue(2);
    (prisma.candidateProjects.update as jest.Mock).mockResolvedValue({});

    const result = await service.assignInterviewCoordinator('map-1', 'ic-pref');

    expect(result.id).toBe('ic-pref');
    expect(prisma.candidateProjects.update).toHaveBeenCalledWith({
      where: { id: 'map-1' },
      data: {
        assignedInterviewCoordinatorId: 'ic-pref',
        assignedInterviewCoordinatorAt: expect.any(Date),
      },
    });
  });

  it('assigns the least-loaded coordinator when none is set', async () => {
    (prisma.candidateProjects.findUnique as jest.Mock).mockResolvedValue({
      assignedInterviewCoordinatorId: null,
      assignedInterviewCoordinator: null,
    });
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'ic-a',
        name: 'Alice',
        email: 'alice@example.com',
        assignedInterviewCoordinatorCandidateProjects: Array.from(
          { length: 10 },
          (_, i) => ({ id: `a-${i}` }),
        ),
      },
      {
        id: 'ic-b',
        name: 'Bob',
        email: 'bob@example.com',
        assignedInterviewCoordinatorCandidateProjects: Array.from(
          { length: 5 },
          (_, i) => ({ id: `b-${i}` }),
        ),
      },
    ]);
    (prisma.candidateProjects.update as jest.Mock).mockResolvedValue({});

    const result = await service.assignInterviewCoordinator('map-1');

    expect(result.id).toBe('ic-b');
    expect(prisma.candidateProjects.update).toHaveBeenCalledWith({
      where: { id: 'map-1' },
      data: {
        assignedInterviewCoordinatorId: 'ic-b',
        assignedInterviewCoordinatorAt: expect.any(Date),
      },
    });
  });
});
