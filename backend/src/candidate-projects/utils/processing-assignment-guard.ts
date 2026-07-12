import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  buildProcessingAssignmentBlockMessage,
  buildProcessingPipelineBlockMessage,
  CANDIDATE_PROJECT_ASSIGNMENT_BLOCKED_SUB_STATUSES,
  isPipelineBlockedOnProject,
  isSendForProcessingLockReleasedForAssignment,
  getSendForProcessingReleaseReason,
  ProcessingAssignmentConflict,
  SendForProcessingReleaseReason,
} from '../../common/constants/statuses';

export type ReleasedSendForProcessingInfo = {
  projectId: string;
  projectTitle: string;
  releaseReason: SendForProcessingReleaseReason;
  sentAt: Date;
};

export type SendForProcessingLockConflict = {
  projectId: string;
  projectTitle: string;
  sentAt: Date;
} | null;

export async function findActiveSendForProcessingLock(
  prisma: PrismaService,
  candidateId: string,
  excludeInterviewId?: string,
): Promise<SendForProcessingLockConflict> {
  const sentInterviews = await prisma.interview.findMany({
    where: {
      ...(excludeInterviewId ? { id: { not: excludeInterviewId } } : {}),
      readyForProcessingAt: { not: null },
      candidateProjectMap: { candidateId },
    },
    select: {
      id: true,
      readyForProcessingAt: true,
      project: { select: { id: true, title: true } },
      candidateProjectMap: {
        select: {
          project: { select: { id: true, title: true } },
          subStatus: { select: { name: true } },
          processing: { select: { processingStatus: true } },
        },
      },
    },
    orderBy: { readyForProcessingAt: 'desc' },
  });

  for (const row of sentInterviews) {
    if (!row.readyForProcessingAt) continue;

    const subStatusName = row.candidateProjectMap?.subStatus?.name;
    const processingStatus = row.candidateProjectMap?.processing?.processingStatus;
    if (
      isSendForProcessingLockReleasedForAssignment({
        subStatusName,
        processingStatus,
      })
    ) {
      continue;
    }

    const projectId =
      row.project?.id || row.candidateProjectMap?.project?.id || '';
    const projectTitle =
      row.project?.title ||
      row.candidateProjectMap?.project?.title ||
      'another project';

    return {
      projectId,
      projectTitle,
      sentAt: row.readyForProcessingAt,
    };
  }

  return null;
}

export async function findActiveSendForProcessingLocksByCandidateIds(
  prisma: PrismaService,
  candidateIds: string[],
): Promise<Map<string, { sentAt: Date; projectTitle: string }>> {
  const map = new Map<string, { sentAt: Date; projectTitle: string }>();
  if (!candidateIds.length) {
    return map;
  }

  const sentInterviews = await prisma.interview.findMany({
    where: {
      readyForProcessingAt: { not: null },
      candidateProjectMap: { candidateId: { in: candidateIds } },
    },
    select: {
      readyForProcessingAt: true,
      project: { select: { title: true } },
      candidateProjectMap: {
        select: {
          candidateId: true,
          project: { select: { title: true } },
          subStatus: { select: { name: true } },
          processing: { select: { processingStatus: true } },
        },
      },
    },
    orderBy: { readyForProcessingAt: 'desc' },
  });

  for (const row of sentInterviews) {
    const candidateId = row.candidateProjectMap?.candidateId;
    if (!candidateId || !row.readyForProcessingAt || map.has(candidateId)) {
      continue;
    }

    const subStatusName = row.candidateProjectMap?.subStatus?.name;
    const processingStatus = row.candidateProjectMap?.processing?.processingStatus;
    if (
      isSendForProcessingLockReleasedForAssignment({
        subStatusName,
        processingStatus,
      })
    ) {
      continue;
    }

    const projectTitle =
      row.project?.title ||
      row.candidateProjectMap?.project?.title ||
      'another project';

    map.set(candidateId, {
      sentAt: row.readyForProcessingAt,
      projectTitle,
    });
  }

  return map;
}

export async function findReleasedSendForProcessingByCandidateIds(
  prisma: PrismaService,
  candidateIds: string[],
): Promise<Map<string, ReleasedSendForProcessingInfo>> {
  const map = new Map<string, ReleasedSendForProcessingInfo>();
  if (!candidateIds.length) {
    return map;
  }

  const sentInterviews = await prisma.interview.findMany({
    where: {
      readyForProcessingAt: { not: null },
      candidateProjectMap: { candidateId: { in: candidateIds } },
    },
    select: {
      readyForProcessingAt: true,
      project: { select: { id: true, title: true } },
      candidateProjectMap: {
        select: {
          candidateId: true,
          project: { select: { id: true, title: true } },
          subStatus: { select: { name: true } },
          processing: { select: { processingStatus: true } },
        },
      },
    },
    orderBy: { readyForProcessingAt: 'desc' },
  });

  for (const row of sentInterviews) {
    const candidateId = row.candidateProjectMap?.candidateId;
    if (!candidateId || !row.readyForProcessingAt || map.has(candidateId)) {
      continue;
    }

    const subStatusName = row.candidateProjectMap?.subStatus?.name;
    const processingStatus = row.candidateProjectMap?.processing?.processingStatus;
    const releaseReason = getSendForProcessingReleaseReason({
      subStatusName,
      processingStatus,
    });
    if (!releaseReason) {
      continue;
    }

    const projectId =
      row.project?.id || row.candidateProjectMap?.project?.id || '';
    const projectTitle =
      row.project?.title ||
      row.candidateProjectMap?.project?.title ||
      'another project';

    map.set(candidateId, {
      projectId,
      projectTitle,
      releaseReason,
      sentAt: row.readyForProcessingAt,
    });
  }

  return map;
}

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
