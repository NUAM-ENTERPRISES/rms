import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ROLE_NAMES } from '../common/constants/role-ids';
import { withActiveAccountStatus } from '../users/user-account-status.filter';

export const DOCUMENTATION_PENDING_VERIFICATION_SUB_STATUS =
  'verification_in_progress_document';

export interface DocumentationExecutiveInfo {
  id: string;
  name: string;
  email: string;
  pendingCount: number;
}

@Injectable()
export class DocumentationAssignmentService {
  private readonly logger = new Logger(DocumentationAssignmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Active Documentation Executives ordered by pending send-for-verification workload.
   * Workload = candidate projects assigned to them with sub-status
   * verification_in_progress_document. Tie-break: user id ascending.
   */
  async getExecutiveWithLeastPendingVerificationWorkload(): Promise<DocumentationExecutiveInfo> {
    const executives = await this.prisma.user.findMany({
      where: withActiveAccountStatus({
        userRoles: {
          some: {
            role: { name: ROLE_NAMES.DOCUMENTATION_EXECUTIVE },
          },
        },
      }),
      select: {
        id: true,
        name: true,
        email: true,
        assignedDocumentationCandidateProjects: {
          where: {
            subStatus: { name: DOCUMENTATION_PENDING_VERIFICATION_SUB_STATUS },
          },
          select: { id: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    if (executives.length === 0) {
      throw new BadRequestException(
        'No active Documentation Executive is available to assign document verification',
      );
    }

    const ranked = executives
      .map((executive) => ({
        id: executive.id,
        name: executive.name,
        email: executive.email,
        pendingCount: executive.assignedDocumentationCandidateProjects.length,
      }))
      .sort((a, b) => {
        if (a.pendingCount !== b.pendingCount) {
          return a.pendingCount - b.pendingCount;
        }
        return a.id.localeCompare(b.id);
      });

    return ranked[0];
  }

  /**
   * Persist the Documentation Executive assignee if missing.
   * Re-send / resubmission keeps the existing assignee.
   */
  async assignDocumentationExecutive(
    candidateProjectId: string,
  ): Promise<DocumentationExecutiveInfo> {
    const existing = await this.prisma.candidateProjects.findUnique({
      where: { id: candidateProjectId },
      select: {
        assignedDocumentationExecutiveId: true,
        assignedDocumentationExecutive: {
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
      existing.assignedDocumentationExecutiveId &&
      existing.assignedDocumentationExecutive
    ) {
      const pendingCount = await this.prisma.candidateProjects.count({
        where: {
          assignedDocumentationExecutiveId:
            existing.assignedDocumentationExecutiveId,
          subStatus: { name: DOCUMENTATION_PENDING_VERIFICATION_SUB_STATUS },
        },
      });

      return {
        id: existing.assignedDocumentationExecutive.id,
        name: existing.assignedDocumentationExecutive.name,
        email: existing.assignedDocumentationExecutive.email,
        pendingCount,
      };
    }

    const executive =
      await this.getExecutiveWithLeastPendingVerificationWorkload();

    await this.prisma.candidateProjects.update({
      where: { id: candidateProjectId },
      data: {
        assignedDocumentationExecutiveId: executive.id,
        assignedDocumentationAt: new Date(),
      },
    });

    this.logger.log(
      `Assigned documentation verification ${candidateProjectId} to ${executive.name} (${executive.pendingCount} pending)`,
    );

    return executive;
  }
}
