import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ROLE_NAMES } from '../common/constants/role-ids';
import {
  CANDIDATE_PROJECT_STATUS,
  CLIENT_INTERVIEW_SUB_STATUS_NAMES,
  SCREENING_TRAINING_SUB_STATUS_NAMES,
} from '../common/constants/statuses';
import { withActiveAccountStatus } from '../users/user-account-status.filter';

/** Open IC-queue sub-statuses used for least-workload ranking. */
export const INTERVIEW_COORDINATOR_PENDING_SUB_STATUSES: string[] = [
  CANDIDATE_PROJECT_STATUS.SUBMITTED_TO_CLIENT,
  CANDIDATE_PROJECT_STATUS.SHORTLISTED,
  ...SCREENING_TRAINING_SUB_STATUS_NAMES,
  'interview_assigned',
  CANDIDATE_PROJECT_STATUS.INTERVIEW_SCHEDULED,
  'interview_rescheduled',
  CANDIDATE_PROJECT_STATUS.INTERVIEW_COMPLETED,
];

/** All IC-owned sub-statuses (lists, backfill, migration). */
export const INTERVIEW_COORDINATOR_OWNED_SUB_STATUSES: string[] = [
  CANDIDATE_PROJECT_STATUS.SUBMITTED_TO_CLIENT,
  ...CLIENT_INTERVIEW_SUB_STATUS_NAMES,
  ...SCREENING_TRAINING_SUB_STATUS_NAMES,
];

export interface InterviewCoordinatorInfo {
  id: string;
  name: string;
  email: string;
  pendingCount: number;
}

@Injectable()
export class InterviewCoordinatorAssignmentService {
  private readonly logger = new Logger(
    InterviewCoordinatorAssignmentService.name,
  );

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Active Interview Coordinators ordered by pending IC-queue workload.
   * Tie-break: user id ascending.
   */
  async getCoordinatorWithLeastPendingWorkload(): Promise<InterviewCoordinatorInfo> {
    const coordinators = await this.prisma.user.findMany({
      where: withActiveAccountStatus({
        userRoles: {
          some: {
            role: { name: ROLE_NAMES.INTERVIEW_COORDINATOR },
          },
        },
      }),
      select: {
        id: true,
        name: true,
        email: true,
        assignedInterviewCoordinatorCandidateProjects: {
          where: {
            subStatus: {
              name: { in: INTERVIEW_COORDINATOR_PENDING_SUB_STATUSES },
            },
          },
          select: { id: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    if (coordinators.length === 0) {
      throw new BadRequestException(
        'No active Interview Coordinator is available to assign',
      );
    }

    const ranked = coordinators
      .map((coordinator) => ({
        id: coordinator.id,
        name: coordinator.name,
        email: coordinator.email,
        pendingCount:
          coordinator.assignedInterviewCoordinatorCandidateProjects.length,
      }))
      .sort((a, b) => {
        if (a.pendingCount !== b.pendingCount) {
          return a.pendingCount - b.pendingCount;
        }
        return a.id.localeCompare(b.id);
      });

    return ranked[0];
  }

  private async isActiveInterviewCoordinator(
    userId: string,
  ): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: withActiveAccountStatus({
        id: userId,
        userRoles: {
          some: {
            role: { name: ROLE_NAMES.INTERVIEW_COORDINATOR },
          },
        },
      }),
      select: { id: true },
    });
    return Boolean(user);
  }

  /**
   * Persist the Interview Coordinator assignee if missing.
   * Sticky on re-entry; optional preferredCoordinatorId wins when unset.
   */
  async assignInterviewCoordinator(
    candidateProjectId: string,
    preferredCoordinatorId?: string | null,
  ): Promise<InterviewCoordinatorInfo> {
    const existing = await this.prisma.candidateProjects.findUnique({
      where: { id: candidateProjectId },
      select: {
        assignedInterviewCoordinatorId: true,
        assignedInterviewCoordinator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `Candidate project ${candidateProjectId} not found`,
      );
    }

    if (
      existing.assignedInterviewCoordinatorId &&
      existing.assignedInterviewCoordinator
    ) {
      const pendingCount = await this.prisma.candidateProjects.count({
        where: {
          assignedInterviewCoordinatorId:
            existing.assignedInterviewCoordinatorId,
          subStatus: {
            name: { in: INTERVIEW_COORDINATOR_PENDING_SUB_STATUSES },
          },
        },
      });

      return {
        id: existing.assignedInterviewCoordinator.id,
        name: existing.assignedInterviewCoordinator.name,
        email: existing.assignedInterviewCoordinator.email,
        pendingCount,
      };
    }

    let coordinator: InterviewCoordinatorInfo | null = null;

    if (preferredCoordinatorId) {
      const preferredValid = await this.isActiveInterviewCoordinator(
        preferredCoordinatorId,
      );
      if (preferredValid) {
        const preferred = await this.prisma.user.findUnique({
          where: { id: preferredCoordinatorId },
          select: { id: true, name: true, email: true },
        });
        if (preferred) {
          const pendingCount = await this.prisma.candidateProjects.count({
            where: {
              assignedInterviewCoordinatorId: preferred.id,
              subStatus: {
                name: { in: INTERVIEW_COORDINATOR_PENDING_SUB_STATUSES },
              },
            },
          });
          coordinator = {
            id: preferred.id,
            name: preferred.name,
            email: preferred.email,
            pendingCount,
          };
        }
      }
    }

    if (!coordinator) {
      coordinator = await this.getCoordinatorWithLeastPendingWorkload();
    }

    await this.prisma.candidateProjects.update({
      where: { id: candidateProjectId },
      data: {
        assignedInterviewCoordinatorId: coordinator.id,
        assignedInterviewCoordinatorAt: new Date(),
      },
    });

    this.logger.log(
      `Assigned interview coordination ${candidateProjectId} to ${coordinator.name} (${coordinator.pendingCount} pending)`,
    );

    return coordinator;
  }
}
