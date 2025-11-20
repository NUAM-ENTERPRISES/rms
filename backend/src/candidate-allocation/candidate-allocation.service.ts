import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CandidateMatchingService,
  MatchedCandidate,
} from '../candidate-matching/candidate-matching.service';
import {
  RecruiterPoolService,
  RecruiterInfo,
} from '../recruiter-pool/recruiter-pool.service';
import { RoundRobinService } from '../round-robin/round-robin.service';
import { OutboxService } from '../notifications/outbox.service';

export interface AllocationResult {
  considered: number;
  assigned: number;
  skippedDuplicates: number;
  errors: string[];
}

export interface AllocationJobData {
  projectId: string;
  roleNeededId?: string;
  batchSize?: number;
}

@Injectable()
export class CandidateAllocationService {
  private readonly logger = new Logger(CandidateAllocationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly candidateMatchingService: CandidateMatchingService,
    private readonly recruiterPoolService: RecruiterPoolService,
    private readonly roundRobinService: RoundRobinService,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * Allocate candidates for a specific role
   */
  async allocateForRole(
    projectId: string,
    roleNeededId: string,
    recruiters: RecruiterInfo[],
    specificCandidateId?: string,
  ): Promise<AllocationResult> {
    this.logger.log(
      `Starting allocation for project ${projectId}, role ${roleNeededId}${specificCandidateId ? `, specific candidate ${specificCandidateId}` : ''}`,
    );

    if (recruiters.length === 0) {
      throw new BadRequestException('No recruiters available for allocation');
    }

    // Get eligible candidates
    let matchedCandidates;
    if (specificCandidateId) {
      // Check if specific candidate is eligible
      const candidate =
        await this.candidateMatchingService.findEligibleCandidates({
          roleNeededId,
          projectId,
          candidateId: specificCandidateId,
        });
      matchedCandidates = candidate;
    } else {
      // Get all eligible candidates
      matchedCandidates =
        await this.candidateMatchingService.findEligibleCandidates({
          roleNeededId,
          projectId,
        });
    }

    if (matchedCandidates.length === 0) {
      this.logger.warn(`No eligible candidates found for role ${roleNeededId}`);
      return {
        considered: 0,
        assigned: 0,
        skippedDuplicates: 0,
        errors: [],
      };
    }

    // Process all candidates (no batch limit for specific candidate allocation)
    const candidatesToProcess = matchedCandidates;
    this.logger.log(`Processing ${candidatesToProcess.length} candidates`);

    const result: AllocationResult = {
      considered: candidatesToProcess.length,
      assigned: 0,
      skippedDuplicates: 0,
      errors: [],
    };

    // Process each candidate
    for (const matchedCandidate of candidatesToProcess) {
      try {
        const recruiter = await this.roundRobinService.getNextRecruiter(
          projectId,
          roleNeededId,
          recruiters,
        );

        // Create allocation in transaction
        await this.prisma.$transaction(async (tx) => {
          // Create candidate project mapping
          await tx.candidateProjects.create({
            data: {
              candidateId: matchedCandidate.candidateId,
              projectId,
              roleNeededId,
              currentProjectStatusId: 1,
              recruiterId: recruiter.id,
              assignedAt: new Date(),
            },
          });

          // Note: No need to update candidate.assignedTo as it's been removed
          // All recruiter assignments are tracked via CandidateProjects.recruiterId
        });

        // Publish notification event
        await this.outboxService.publishEvent('CandidateAssignedToRecruiter', {
          candidateId: matchedCandidate.candidateId,
          projectId,
          roleNeededId,
          recruiterId: recruiter.id,
          matchScore: matchedCandidate.score,
          matchReasons: matchedCandidate.matchReasons,
        });

        result.assigned++;
        this.logger.debug(
          `Assigned candidate ${matchedCandidate.candidateId} to recruiter ${recruiter.name}`,
        );
      } catch (error) {
        if (error.code === 'P2002') {
          // Unique constraint violation - candidate already allocated
          result.skippedDuplicates++;
          this.logger.debug(
            `Skipped duplicate allocation for candidate ${matchedCandidate.candidateId}`,
          );
        } else {
          result.errors.push(
            `Failed to allocate candidate ${matchedCandidate.candidateId}: ${error.message}`,
          );
          this.logger.error(
            `Allocation error for candidate ${matchedCandidate.candidateId}:`,
            error.stack,
          );
        }
      }
    }

    this.logger.log(
      `Allocation completed: ${result.assigned} assigned, ${result.skippedDuplicates} skipped, ${result.errors.length} errors`,
    );
    return result;
  }

  /**
   * Allocate candidates for entire project (all roles)
   */
  async allocateForProject(
    projectId: string,
    recruiters: RecruiterInfo[],
  ): Promise<Record<string, AllocationResult>> {
    this.logger.log(`Starting allocation for entire project ${projectId}`);

    // Get project with roles
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        rolesNeeded: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const results: Record<string, AllocationResult> = {};

    // Allocate for each role
    for (const roleNeeded of project.rolesNeeded) {
      try {
        // Get recruiters for this project
        const recruiters = await this.getProjectRecruiters(projectId);

        results[roleNeeded.id] = await this.allocateForRole(
          projectId,
          roleNeeded.id,
          recruiters,
        );
      } catch (error) {
        this.logger.error(
          `Failed to allocate for role ${roleNeeded.id}:`,
          error.stack,
        );
        results[roleNeeded.id] = {
          considered: 0,
          assigned: 0,
          skippedDuplicates: 0,
          errors: [error.message],
        };
      }
    }

    return results;
  }

  /**
   * Get allocation status for a project
   */
  async getAllocationStatus(projectId: string): Promise<any[]> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        rolesNeeded: {
          include: {
            candidateAllocations: {
              include: {
                candidate: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    currentStatus: true,
                  },
                },
                currentProjectStatus: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return project.rolesNeeded.map((role) => {
      const allocations = role.candidateAllocations;
      const statusCounts = allocations.reduce(
        (acc, allocation) => {
          const statusName = allocation.currentProjectStatus?.statusName || 'unknown';
          acc[statusName] = (acc[statusName] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        roleNeededId: role.id,
        designation: role.designation,
        quantity: role.quantity,
        activeNominations: statusCounts.nominated || 0,
        selected: statusCounts.selected || 0,
        processing: statusCounts.processing || 0,
        hired: statusCounts.hired || 0,
        totalAllocated: allocations.length,
        duplicateBlocks: 0, // Would need to track this separately
      };
    });
  }

  /**
   * Get recruiter workload
   */
  async getRecruiterWorkload(recruiterId: string): Promise<any> {
    const recruiter =
      await this.recruiterPoolService.getRecruiterById(recruiterId);
    if (!recruiter) {
      throw new NotFoundException(`Recruiter ${recruiterId} not found`);
    }

    const allocations = await this.prisma.candidateProjects.findMany({
      where: {
        recruiterId: recruiterId,
      },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            currentStatus: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        roleNeeded: {
          select: {
            id: true,
            designation: true,
          },
        },
        currentProjectStatus: true,
      },
    });

    const statusCounts = allocations.reduce(
      (acc, allocation) => {
        const statusName = allocation.currentProjectStatus?.statusName || 'unknown';
        acc[statusName] = (acc[statusName] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      recruiter,
      totalAllocations: allocations.length,
      statusCounts,
      recentAllocations: allocations.slice(0, 10), // Last 10 allocations
    };
  }

  /**
   * Get recruiters assigned to a project
   */
  async getProjectRecruiters(projectId: string): Promise<RecruiterInfo[]> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        team: {
          include: {
            userTeams: {
              include: {
                user: {
                  include: {
                    userRoles: {
                      include: {
                        role: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!project?.team) {
      return [];
    }

    // Filter users with Recruiter role and calculate workload
    const recruiters = await Promise.all(
      project.team.userTeams
        .map((ut) => ut.user)
        .filter((user) =>
          user.userRoles.some((ur) => ur.role.name === 'Recruiter'),
        )
        .map(async (user) => {
          // Calculate current workload (active candidates)
          const workload = await this.prisma.candidateProjects.count({
            where: {
              recruiterId: user.id,
              currentProjectStatus: {
                statusName: {
                  in: [
                    'nominated',
                    'verification_in_progress',
                    'pending_documents',
                  ],
                },
              },
            },
          });

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            workload,
          };
        }),
    );

    return recruiters;
  }
}
