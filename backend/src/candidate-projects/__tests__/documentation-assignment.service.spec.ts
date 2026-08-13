import { BadRequestException } from '@nestjs/common';
import { DocumentationAssignmentService } from '../documentation-assignment.service';
import { PrismaService } from '../../database/prisma.service';

describe('DocumentationAssignmentService', () => {
  let service: DocumentationAssignmentService;
  const prisma = {
    user: { findMany: jest.fn() },
    candidateProjects: {
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DocumentationAssignmentService(prisma);
  });

  it('picks the Documentation Executive with the least pending verification_in_progress_document workload', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'rema',
        name: 'Rema',
        email: 'rema@example.com',
        assignedDocumentationCandidateProjects: Array.from({ length: 10 }, (_, i) => ({
          id: `rema-${i}`,
        })),
      },
      {
        id: 'binu',
        name: 'Binu',
        email: 'binu@example.com',
        assignedDocumentationCandidateProjects: Array.from({ length: 5 }, (_, i) => ({
          id: `binu-${i}`,
        })),
      },
    ]);

    const result =
      await service.getExecutiveWithLeastPendingVerificationWorkload();

    expect(result).toEqual({
      id: 'binu',
      name: 'Binu',
      email: 'binu@example.com',
      pendingCount: 5,
    });
  });

  it('tie-breaks equal workload by user id ascending', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'z-exec',
        name: 'Zed',
        email: 'zed@example.com',
        assignedDocumentationCandidateProjects: [{ id: 'z-1' }],
      },
      {
        id: 'a-exec',
        name: 'Ann',
        email: 'ann@example.com',
        assignedDocumentationCandidateProjects: [{ id: 'a-1' }],
      },
    ]);

    const result =
      await service.getExecutiveWithLeastPendingVerificationWorkload();

    expect(result.id).toBe('a-exec');
  });

  it('throws when no active Documentation Executive exists', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

    await expect(
      service.getExecutiveWithLeastPendingVerificationWorkload(),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('keeps the existing assignee on re-send', async () => {
    (prisma.candidateProjects.findUnique as jest.Mock).mockResolvedValue({
      assignedDocumentationExecutiveId: 'binu',
      assignedDocumentationExecutive: {
        id: 'binu',
        name: 'Binu',
        email: 'binu@example.com',
      },
    });
    (prisma.candidateProjects.count as jest.Mock).mockResolvedValue(6);

    const result = await service.assignDocumentationExecutive('map-1');

    expect(result.id).toBe('binu');
    expect(prisma.candidateProjects.update).not.toHaveBeenCalled();
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('assigns the least-loaded executive when none is set', async () => {
    (prisma.candidateProjects.findUnique as jest.Mock).mockResolvedValue({
      assignedDocumentationExecutiveId: null,
      assignedDocumentationExecutive: null,
    });
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'rema',
        name: 'Rema',
        email: 'rema@example.com',
        assignedDocumentationCandidateProjects: Array.from({ length: 10 }, (_, i) => ({
          id: `rema-${i}`,
        })),
      },
      {
        id: 'binu',
        name: 'Binu',
        email: 'binu@example.com',
        assignedDocumentationCandidateProjects: Array.from({ length: 5 }, (_, i) => ({
          id: `binu-${i}`,
        })),
      },
    ]);
    (prisma.candidateProjects.update as jest.Mock).mockResolvedValue({});

    const result = await service.assignDocumentationExecutive('map-1');

    expect(result.id).toBe('binu');
    expect(prisma.candidateProjects.update).toHaveBeenCalledWith({
      where: { id: 'map-1' },
      data: {
        assignedDocumentationExecutiveId: 'binu',
        assignedDocumentationAt: expect.any(Date),
      },
    });
  });
});
