import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  buildProcessingAssignmentBlockMessage,
  buildProcessingPipelineBlockMessage,
  CANDIDATE_PROJECT_ASSIGNMENT_BLOCKED_SUB_STATUSES,
  isPipelineBlockedOnProject,
  ProcessingAssignmentConflict,
} from '../../common/constants/statuses';

export async function findProcessingInProgressAssignment(
  prisma: PrismaService,
  candidateId: string,
): Promise<ProcessingAssignmentConflict> {
  const assignment = await prisma.candidateProjects.findFirst({
    where: {
      candidateId,
      subStatus: {
        name: {
          in: [...CANDIDATE_PROJECT_ASSIGNMENT_BLOCKED_SUB_STATUSES],
        },
      },
    },
    include: {
      project: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  if (!assignment?.project) {
    return null;
  }

  return {
    projectId: assignment.project.id,
    projectTitle: assignment.project.title,
  };
}

export async function findProcessingInProgressAssignmentsByCandidateIds(
  prisma: PrismaService,
  candidateIds: string[],
): Promise<Map<string, ProcessingAssignmentConflict>> {
  const map = new Map<string, ProcessingAssignmentConflict>();
  if (!candidateIds.length) {
    return map;
  }

  const assignments = await prisma.candidateProjects.findMany({
    where: {
      candidateId: { in: candidateIds },
      subStatus: {
        name: {
          in: [...CANDIDATE_PROJECT_ASSIGNMENT_BLOCKED_SUB_STATUSES],
        },
      },
    },
    include: {
      project: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  for (const assignment of assignments) {
    if (!assignment.project || map.has(assignment.candidateId)) {
      continue;
    }
    map.set(assignment.candidateId, {
      projectId: assignment.project.id,
      projectTitle: assignment.project.title,
    });
  }

  return map;
}

export async function assertCandidateNotBlockedForNewProjectAssignment(
  prisma: PrismaService,
  candidateId: string,
  targetProjectId?: string,
): Promise<void> {
  const conflict = await findProcessingInProgressAssignment(prisma, candidateId);
  if (!conflict) {
    return;
  }

  if (targetProjectId && conflict.projectId === targetProjectId) {
    return;
  }

  throw new BadRequestException(
    buildProcessingAssignmentBlockMessage(conflict.projectTitle),
  );
}

export async function assertNoProcessingConflictForProjectAction(
  prisma: PrismaService,
  candidateId: string,
  targetProjectId: string,
  currentProjectTitle?: string,
): Promise<void> {
  const conflict = await findProcessingInProgressAssignment(prisma, candidateId);
  if (!isPipelineBlockedOnProject(conflict, targetProjectId)) {
    return;
  }

  throw new BadRequestException(
    buildProcessingPipelineBlockMessage(
      conflict!.projectTitle,
      currentProjectTitle,
    ),
  );
}

export function getProcessingEligibilityHardReason(
  conflict: ProcessingAssignmentConflict,
  targetProjectId: string,
  currentProjectTitle?: string,
  hasAssignmentOnTargetProject?: boolean,
): string | null {
  if (!conflict || !isPipelineBlockedOnProject(conflict, targetProjectId)) {
    return null;
  }

  if (hasAssignmentOnTargetProject) {
    return buildProcessingPipelineBlockMessage(
      conflict.projectTitle,
      currentProjectTitle,
    );
  }

  return buildProcessingAssignmentBlockMessage(conflict.projectTitle);
}
