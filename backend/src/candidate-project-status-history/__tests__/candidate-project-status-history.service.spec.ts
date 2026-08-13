import { CandidateProjectStatusHistoryService } from '../candidate-project-status-history.service';
import { PrismaService } from '../../database/prisma.service';

describe('CandidateProjectStatusHistoryService', () => {
  let service: CandidateProjectStatusHistoryService;
  const prisma = {
    candidateProjects: { findFirst: jest.fn() },
    candidateProjectMainStatus: { findMany: jest.fn() },
    candidateProjectSubStatus: { findMany: jest.fn() },
    candidateProjectStatusHistory: { findMany: jest.fn() },
    candidateProjectStatusChangeRequest: { findFirst: jest.fn() },
    country: { findUnique: jest.fn() },
  } as unknown as PrismaService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CandidateProjectStatusHistoryService(prisma);
  });

  it('returns assignedDocumentationExecutive on the pipeline payload', async () => {
    const handler = { id: 'binu', name: 'Binu', email: 'binu@test.com' };
    (prisma.candidateProjects.findFirst as jest.Mock)
      .mockResolvedValueOnce({
        id: 'cpm-1',
        statusBlockedAt: null,
        mainStatus: { id: 'ms-doc', name: 'documents', label: 'Documents' },
        subStatus: {
          id: 'ss-vip',
          name: 'verification_in_progress_document',
          label: 'Verification In Progress',
          stageId: 'st-1',
        },
        previousMainStatus: null,
        previousSubStatus: null,
        assignedDocumentationExecutive: handler,
        roleNeeded: null,
        candidate: {
          id: 'cand-1',
          firstName: 'Abhijith',
          lastName: 'K',
        },
        project: {
          id: 'proj-1',
          title: 'Gulf Nursing',
          client: null,
          team: null,
          country: null,
          creator: null,
          documentRequirements: [],
        },
      })
      .mockResolvedValueOnce(null);
    (prisma.candidateProjectMainStatus.findMany as jest.Mock).mockResolvedValue([
      { id: 'ms-nom', name: 'nominated', label: 'Nominated', order: 1 },
      { id: 'ms-doc', name: 'documents', label: 'Documents', order: 2 },
      { id: 'ms-int', name: 'interview', label: 'Interview', order: 3 },
      { id: 'ms-proc', name: 'processing', label: 'Processing', order: 4 },
      { id: 'ms-fin', name: 'final', label: 'Final', order: 5 },
    ]);
    (prisma.candidateProjectSubStatus.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.candidateProjectStatusHistory.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.candidateProjectStatusChangeRequest.findFirst as jest.Mock).mockResolvedValue(
      null,
    );

    const result = await service.getCandidateProjectStatusHistory('cand-1', 'proj-1');

    expect(prisma.candidateProjects.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { candidateId: 'cand-1', projectId: 'proj-1' },
        include: expect.objectContaining({
          assignedDocumentationExecutive: {
            select: { id: true, name: true, email: true },
          },
        }),
      }),
    );
    expect(result.data.assignedDocumentationExecutive).toEqual(handler);
    expect(result.data.currentStatus.mainStatus.name).toBe('documents');
  });
});
