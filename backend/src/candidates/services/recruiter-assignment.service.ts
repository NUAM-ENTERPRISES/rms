import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CANDIDATE_STATUS } from '../../common/constants/statuses';

export interface RecruiterInfo {
  id: string;
  name: string;
  email: string;
  candidateCount?: number;
}

@Injectable()
export class RecruiterAssignmentService {
  private readonly logger = new Logger(RecruiterAssignmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the best recruiter to assign to a candidate based on user role and workload
   */
  async getBestRecruiterForAssignment(
    candidateId: string,
    createdByUserId: string,
  ): Promise<RecruiterInfo> {
    // Get the user who created the candidate
    const creator = await this.prisma.user.findUnique({
      where: { id: createdByUserId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!creator) {
      throw new Error(`User with ID ${createdByUserId} not found`);
    }

    // Check if creator is a recruiter
    const isRecruiter = creator.userRoles.some(
      (userRole) => userRole.role.name === 'Recruiter',
    );

    if (isRecruiter) {
      this.logger.log(
        `Creator ${creator.name} is a recruiter, assigning to them`,
      );
      return {
        id: creator.id,
        name: creator.name,
        email: creator.email,
      };
    }

    // If not a recruiter, find the best recruiter using workload-based assignment
    return await this.getRecruiterWithLeastWorkload();
  }

  /**
   * Get recruiter with the least number of active candidates
   */
  async getRecruiterWithLeastWorkload(): Promise<RecruiterInfo> {
    // Get all recruiters with their active candidate count
    const recruiters = await this.prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: 'Recruiter',
            },
          },
        },
      },
      include: {
        candidateRecruiterAssignments: {
          where: {
            isActive: true,
          },
        },
      },
    });

    if (recruiters.length === 0) {
      throw new Error('No recruiters found in the system');
    }

    // Calculate workload for each recruiter
    const recruitersWithWorkload = recruiters.map((recruiter) => ({
      id: recruiter.id,
      name: recruiter.name,
      email: recruiter.email,
      candidateCount: recruiter.candidateRecruiterAssignments.length,
    }));

    // Sort by candidate count (ascending) and return the one with least workload
    const bestRecruiter = recruitersWithWorkload.sort(
      (a, b) => a.candidateCount - b.candidateCount,
    )[0];

    this.logger.log(
      `Assigned recruiter ${bestRecruiter.name} with ${bestRecruiter.candidateCount} active candidates`,
    );

    return bestRecruiter;
  }

  /**
   * Get CRE (Customer Relationship Executive) with the least workload
   */
  async getCREWithLeastWorkload(): Promise<RecruiterInfo> {
    // Get all CREs with their active RNR candidate count
    const cres = await this.prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: 'CRE',
            },
          },
        },
      },
      include: {
        candidateRecruiterAssignments: {
          where: {
            isActive: true,
            // candidate: {
            //   currentStatus: CANDIDATE_STATUS.RNR,
            // },
          },
        },
      },
    });

    if (cres.length === 0) {
      throw new Error('No CREs found in the system');
    }

    // Calculate RNR workload for each CRE
    const cresWithWorkload = cres.map((cre) => ({
      id: cre.id,
      name: cre.name,
      email: cre.email,
      candidateCount: cre.candidateRecruiterAssignments.length,
    }));

    // Sort by RNR candidate count (ascending) and return the one with least workload
    const bestCRE = cresWithWorkload.sort(
      (a, b) => a.candidateCount - b.candidateCount,
    )[0];

    this.logger.log(
      `Assigned CRE ${bestCRE.name} with ${bestCRE.candidateCount} active RNR candidates`,
    );

    return bestCRE;
  }

  /**
   * Assign recruiter to candidate with automatic assignment logic
   */
  async assignRecruiterToCandidate(
    candidateId: string,
    createdByUserId: string,
    reason?: string,
  ): Promise<RecruiterInfo> {
    const recruiter = await this.getBestRecruiterForAssignment(
      candidateId,
      createdByUserId,
    );

    // Deactivate any existing active assignments
    await this.prisma.candidateRecruiterAssignment.updateMany({
      where: {
        candidateId,
        isActive: true,
      },
      data: {
        isActive: false,
        unassignedAt: new Date(),
        unassignedBy: createdByUserId,
      },
    });

    // Create new assignment
    await this.prisma.candidateRecruiterAssignment.create({
      data: {
        candidateId,
        recruiterId: recruiter.id,
        assignedBy: createdByUserId,
        reason: reason || 'Automatic assignment on candidate creation',
      },
    });

    this.logger.log(
      `Assigned recruiter ${recruiter.name} to candidate ${candidateId}`,
    );

    return recruiter;
  }

  /**
   * Assign CRE to candidate (for RNR status)
   */
  async assignCREToCandidate(
    candidateId: string,
    assignedByUserId?: string,
    reason?: string,
  ): Promise<RecruiterInfo> {
    const cre = await this.getCREWithLeastWorkload();
    const assignerUserId = await this.resolveAssignerUserId(
      assignedByUserId,
      cre.id,
    );

    // Deactivate any existing active assignments
    await this.prisma.candidateRecruiterAssignment.updateMany({
      where: {
        candidateId,
        isActive: true,
      },
      data: {
        isActive: false,
        unassignedAt: new Date(),
        unassignedBy: assignerUserId,
      },
    });

    // Create new CRE assignment
    await this.prisma.candidateRecruiterAssignment.create({
      data: {
        candidateId,
        recruiterId: cre.id,
        assignedBy: assignerUserId,
        reason: reason || 'Automatic CRE assignment for RNR status',
      },
    });

    this.logger.log(
      `Assigned CRE ${cre.name} to candidate ${candidateId} for RNR handling`,
    );

    return cre;
  }

  private async resolveAssignerUserId(
    preferredUserId: string | undefined,
    fallbackUserId: string,
  ): Promise<string> {
    if (preferredUserId) {
      const userExists = await this.prisma.user.findUnique({
        where: { id: preferredUserId },
        select: { id: true },
      });

      if (userExists) {
        return preferredUserId;
      }

      this.logger.warn(
        `Assigner user ${preferredUserId} not found. Falling back to ${fallbackUserId}.`,
      );
    }

    return fallbackUserId;
  }

  /**
   * Get all RNR candidates that need CRE assignment (3+ days in RNR status)
   */
  async getRNRCandidatesNeedingCREAssignment(): Promise<Array<{
    candidateId: string;
    candidateName: string;
    daysInRNR: number;
    currentRecruiterId?: string;
  }>> {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const rnrCandidates = await this.prisma.candidate.findMany({
      where: {
        // currentStatus: CANDIDATE_STATUS.RNR,
        updatedAt: {
          lte: threeDaysAgo,
        },
      },
      include: {
        recruiterAssignments: {
          where: {
            isActive: true,
          },
          include: {
            recruiter: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            assignedAt: 'desc',
          },
          take: 1,
        },
      },
    });

    return rnrCandidates.map((candidate) => {
      const daysInRNR = Math.floor(
        (Date.now() - candidate.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        candidateId: candidate.id,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        daysInRNR,
        currentRecruiterId: candidate.recruiterAssignments[0]?.recruiterId,
      };
    });
  }
}
