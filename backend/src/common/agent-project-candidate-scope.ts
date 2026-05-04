import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isAgentCandidateSource } from './constants/candidate-constants';

type AgentProjectClient = Pick<Prisma.TransactionClient, 'agentProject'>;

/**
 * Agent-sourced candidates may only be nominated to projects where the agent is engaged
 * via AgentProject (Agents › Client projects).
 */
export async function assertAgentCandidateLinkedToAgentProject(
  prisma: AgentProjectClient,
  candidate: { source?: string | null; agentId?: string | null },
  projectId: string,
): Promise<void> {
  if (!isAgentCandidateSource(candidate.source) || !candidate.agentId) {
    return;
  }

  const link = await prisma.agentProject.findUnique({
    where: {
      agentId_projectId: { agentId: candidate.agentId, projectId },
    },
    select: { isActive: true },
  });

  if (!link?.isActive) {
    throw new BadRequestException(
      'Agent-sourced candidates can only be nominated to projects linked to their agent under Agents › Client projects. Link the agent to this project first.',
    );
  }
}

/**
 * Eligible pool: candidates with **no** `agentId` use the normal project-wide pool.
 * Candidates **linked to an agent** (`agentId` set) appear only for projects listed in
 * `agent_candidate_declared_projects` for that `projectId` (per-candidate intent).
 * Scoping uses `agentId`, not `source`, so inconsistent `source` values cannot leak
 * agent-supplied candidates onto unrelated client projects.
 */
export function agentSourceEligibleCandidateWhere(
  projectId: string,
): Prisma.CandidateWhereInput {
  return {
    OR: [
      { agentId: null },
      {
        agentCandidateDeclaredProjects: {
          some: { projectId },
        },
      },
    ],
  };
}

/**
 * Consolidated "All" list: same as eligible for agent-linked rows, plus anyone already
 * nominated on this `projectId` (`candidate_projects`).
 */
export function agentSourceConsolidatedCandidateWhere(
  projectId: string,
): Prisma.CandidateWhereInput {
  return {
    OR: [
      { agentId: null },
      {
        agentCandidateDeclaredProjects: {
          some: { projectId },
        },
      },
      {
        projects: {
          some: { projectId },
        },
      },
    ],
  };
}
