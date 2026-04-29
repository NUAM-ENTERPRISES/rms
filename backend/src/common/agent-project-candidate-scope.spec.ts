import { BadRequestException } from '@nestjs/common';
import {
  assertAgentCandidateLinkedToAgentProject,
  agentSourceEligibleCandidateWhere,
  agentSourceConsolidatedCandidateWhere,
} from './agent-project-candidate-scope';

describe('agent-project-candidate-scope', () => {
  describe('assertAgentCandidateLinkedToAgentProject', () => {
    it('no-ops when source is not agent', async () => {
      const prisma = { agentProject: { findUnique: jest.fn() } };
      await assertAgentCandidateLinkedToAgentProject(prisma as any, { source: 'manual', agentId: 'a1' }, 'p1');
      expect(prisma.agentProject.findUnique).not.toHaveBeenCalled();
    });

    it('throws when agent link inactive', async () => {
      const prisma = {
        agentProject: {
          findUnique: jest.fn().mockResolvedValue({ isActive: false }),
        },
      };
      await expect(
        assertAgentCandidateLinkedToAgentProject(prisma as any, { source: 'agent', agentId: 'a1' }, 'p1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows when active link exists', async () => {
      const prisma = {
        agentProject: {
          findUnique: jest.fn().mockResolvedValue({ isActive: true }),
        },
      };
      await assertAgentCandidateLinkedToAgentProject(prisma as any, { source: 'agent', agentId: 'a1' }, 'p1');
      expect(prisma.agentProject.findUnique).toHaveBeenCalled();
    });
  });

  it('eligible where scopes agent-linked rows by declared project only', () => {
    const w = agentSourceEligibleCandidateWhere('pid');
    expect(w.OR).toEqual([
      { agentId: null },
      {
        agentCandidateDeclaredProjects: {
          some: { projectId: 'pid' },
        },
      },
    ]);
  });

  it('consolidated where includes agentId null, declared project, and nomination', () => {
    const w = agentSourceConsolidatedCandidateWhere('pid');
    expect(w.OR?.length).toBe(3);
    expect(w.OR).toEqual(
      expect.arrayContaining([
        { agentId: null },
        expect.objectContaining({
          agentCandidateDeclaredProjects: { some: { projectId: 'pid' } },
        }),
        expect.objectContaining({ projects: { some: { projectId: 'pid' } } }),
      ]),
    );
  });
});
