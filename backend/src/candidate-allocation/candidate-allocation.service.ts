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
    batchSize: number = 100,
  ): Promise<AllocationResult> {
    this.logger.log(
      `Starting allocation for project ${projectId}, role ${roleNeededId}, batch size ${batchSize}`,
    );

    // Get recruiter pool
    const recruiters = await this.recruiterPoolService.getRecruiters();
    if (recruiters.length === 0) {
      throw new BadRequestException('No recruiters available for allocation');
    }

    // Get eligible candidates
    const matchedCandidates =
      await this.candidateMatchingService.findEligibleCandidates({
        roleNeededId,
        projectId,
      });

    if (matchedCandidates.length === 0) {
      this.logger.warn(`No eligible candidates found for role ${roleNeededId}`);
      return {
        considered: 0,
        assigned: 0,
        skippedDuplicates: 0,
        errors: [],
      };
    }

    // Limit to batch size
    const candidatesToProcess = matchedCandidates.slice(0, batchSize);
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
          await tx.candidateProjectMap.create({
            data: {
              candidateId: matchedCandidate.candidateId,
              projectId,
              roleNeededId,
              status: 'nominated',
              nominatedBy: recruiter.id,
              nominatedDate: new Date(),
            },
          });

          // Update candidate assignment
          await tx.candidate.update({
            where: { id: matchedCandidate.candidateId },
            data: {
              assignedTo: recruiter.id,
            },
          });
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
    batchSize: number = 100,
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
        results[roleNeeded.id] = await this.allocateForRole(
          projectId,
          roleNeeded.id,
          batchSize,
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
          acc[allocation.status] = (acc[allocation.status] || 0) + 1;
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

    const allocations = await this.prisma.candidateProjectMap.findMany({
      where: {
        nominatedBy: recruiterId,
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
      },
    });

    const statusCounts = allocations.reduce(
      (acc, allocation) => {
        acc[allocation.status] = (acc[allocation.status] || 0) + 1;
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
}
