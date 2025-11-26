import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateMockInterviewDto } from './dto/create-mock-interview.dto';
import { UpdateMockInterviewDto } from './dto/update-mock-interview.dto';
import { CompleteMockInterviewDto } from './dto/complete-mock-interview.dto';
import { QueryMockInterviewsDto } from './dto/query-mock-interviews.dto';
import {
  CANDIDATE_PROJECT_STATUS,
  MOCK_INTERVIEW_DECISION,
} from '../../common/constants/statuses';

@Injectable()
export class MockInterviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create/Schedule a new mock interview
   */
  async create(dto: CreateMockInterviewDto) {
    // Verify candidate-project exists and is in correct status
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id: dto.candidateProjectMapId },
      include: {
        candidate: {
          select: { id: true, firstName: true, lastName: true },
        },
        project: { select: { id: true, title: true } },
        roleNeeded: { select: { id: true, designation: true } },
        subStatus: true,
      },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        `Candidate-Project with ID "${dto.candidateProjectMapId}" not found`,
      );
    }

    // Check if already has a pending mock interview
    const existingInterview = await this.prisma.mockInterview.findFirst({
      where: {
        candidateProjectMapId: dto.candidateProjectMapId,
        decision: null, // Not yet completed
      },
    });

    if (existingInterview) {
      throw new ConflictException(
        'This candidate already has a pending mock interview',
      );
    }

    // Verify coordinator exists and has correct role
    const coordinator = await this.prisma.user.findFirst({
      where: {
        id: dto.coordinatorId,
        userRoles: {
          some: {
            role: {
              name: 'Interview Coordinator',
            },
          },
        },
      },
    });

    if (!coordinator) {
      throw new NotFoundException(
        `Interview Coordinator with ID "${dto.coordinatorId}" not found`,
      );
    }

    return this.prisma.mockInterview.create({
      data: {
        candidateProjectMapId: dto.candidateProjectMapId,
        coordinatorId: dto.coordinatorId,
        scheduledTime: dto.scheduledTime ? new Date(dto.scheduledTime) : null,
        duration: dto.duration ?? 60,
        meetingLink: dto.meetingLink,
        mode: dto.mode ?? 'video',
      },
      include: {
        candidateProjectMap: {
          include: {
            candidate: {
              select: { firstName: true, lastName: true, email: true },
            },
            project: { select: { title: true } },
            roleNeeded: { select: { designation: true } },
          },
        },
      },
    });
  }

  /**
   * Find all mock interviews with optional filtering
   */
  async findAll(query: QueryMockInterviewsDto) {
    const where: any = {};

    if (query.candidateProjectMapId) {
      where.candidateProjectMapId = query.candidateProjectMapId;
    }

    if (query.coordinatorId) {
      where.coordinatorId = query.coordinatorId;
    }

    if (query.decision) {
      where.decision = query.decision;
    }

    return this.prisma.mockInterview.findMany({
      where,
      include: {
        candidateProjectMap: {
          include: {
            candidate: {
              select: { id: true, firstName: true, lastName: true },
            },
            project: { select: { id: true, title: true } },
            roleNeeded: { select: { designation: true } },
          },
        },
        checklistItems: {
          orderBy: { category: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find a single mock interview by ID
   */
  async findOne(id: string) {
    const interview = await this.prisma.mockInterview.findUnique({
      where: { id },
      include: {
        candidateProjectMap: {
          include: {
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            project: { select: { id: true, title: true } },
            roleNeeded: { select: { id: true, designation: true } },
          },
        },
        checklistItems: {
          orderBy: { category: 'asc' },
        },
        trainingAssignments: {
          include: {
            trainingSessions: true,
          },
        },
      },
    });

    if (!interview) {
      throw new NotFoundException(`Mock Interview with ID "${id}" not found`);
    }

    return interview;
  }

  /**
   * Update a mock interview (scheduling details only)
   */
  async update(id: string, dto: UpdateMockInterviewDto) {
    // Verify interview exists
    const existing = await this.findOne(id);

    // Don't allow updates if already completed
    if (existing.conductedAt) {
      throw new BadRequestException(
        'Cannot update a completed mock interview. Use the complete endpoint instead.',
      );
    }

    return this.prisma.mockInterview.update({
      where: { id },
      data: {
        scheduledTime: dto.scheduledTime
          ? new Date(dto.scheduledTime)
          : undefined,
        duration: dto.duration,
        meetingLink: dto.meetingLink,
        mode: dto.mode,
      },
      include: {
        candidateProjectMap: {
          include: {
            candidate: {
              select: { firstName: true, lastName: true, email: true },
            },
            project: { select: { title: true } },
            roleNeeded: { select: { designation: true } },
          },
        },
      },
    });
  }

  /**
   * Complete a mock interview with assessment results
   */
  async complete(id: string, dto: CompleteMockInterviewDto, userId: string) {
    // Verify interview exists
    const existing = await this.findOne(id);

    // Check if already completed
    if (existing.conductedAt) {
      throw new BadRequestException('This mock interview is already completed');
    }

    // Use transaction to update interview and create checklist items
    const result = await this.prisma.$transaction(async (tx) => {
      // Update the mock interview
      const updated = await tx.mockInterview.update({
        where: { id },
        data: {
          conductedAt: new Date(),
          overallRating: dto.overallRating,
          decision: dto.decision,
          remarks: dto.remarks,
          strengths: dto.strengths,
          areasOfImprovement: dto.areasOfImprovement,
        },
      });

      // Create checklist items
      if (dto.checklistItems && dto.checklistItems.length > 0) {
        await tx.mockInterviewChecklistItem.createMany({
          data: dto.checklistItems.map((item) => ({
            mockInterviewId: id,
            category: item.category,
            criterion: item.criterion,
            passed: item.passed,
            rating: item.rating,
            notes: item.notes,
          })),
        });
      }

      // Update candidate-project status based on decision
      const statusUpdate: any = {};

      if (dto.decision === MOCK_INTERVIEW_DECISION.APPROVED) {
        statusUpdate.subStatus = {
          connect: {
            name: CANDIDATE_PROJECT_STATUS.MOCK_INTERVIEW_PASSED,
          },
        };
      } else if (dto.decision === MOCK_INTERVIEW_DECISION.NEEDS_TRAINING) {
        statusUpdate.subStatus = {
          connect: {
            name: CANDIDATE_PROJECT_STATUS.MOCK_INTERVIEW_FAILED,
          },
        };
      } else if (dto.decision === MOCK_INTERVIEW_DECISION.REJECTED) {
        statusUpdate.subStatus = {
          connect: {
            name: CANDIDATE_PROJECT_STATUS.REJECTED_INTERVIEW,
          },
        };
      }

      await tx.candidateProjects.update({
        where: { id: existing.candidateProjectMapId },
        data: statusUpdate,
      });

      // Create status history entry
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId: existing.candidateProjectMapId,
          subStatusId: statusUpdate.subStatus.connect.name,
          subStatusSnapshot: statusUpdate.subStatus.connect.name,
          changedById: userId,
          reason: `Mock interview ${dto.decision}`,
          notes: dto.remarks,
        },
      });

      return updated;
    });

    // Fetch complete result with relations
    return this.findOne(id);
  }

  /**
   * Delete a mock interview (only if not completed)
   */
  async remove(id: string) {
    // Verify interview exists
    const existing = await this.findOne(id);

    // Don't allow deletion if completed
    if (existing.conductedAt) {
      throw new BadRequestException('Cannot delete a completed mock interview');
    }

    await this.prisma.mockInterview.delete({
      where: { id },
    });

    return { success: true, message: 'Mock interview deleted successfully' };
  }

  /**
   * Get mock interview statistics for a coordinator
   */
  async getCoordinatorStats(coordinatorId: string) {
    const [total, completed, pending, approved, needsTraining, rejected] =
      await Promise.all([
        this.prisma.mockInterview.count({
          where: { coordinatorId },
        }),
        this.prisma.mockInterview.count({
          where: { coordinatorId, conductedAt: { not: null } },
        }),
        this.prisma.mockInterview.count({
          where: { coordinatorId, conductedAt: null },
        }),
        this.prisma.mockInterview.count({
          where: {
            coordinatorId,
            decision: MOCK_INTERVIEW_DECISION.APPROVED,
          },
        }),
        this.prisma.mockInterview.count({
          where: {
            coordinatorId,
            decision: MOCK_INTERVIEW_DECISION.NEEDS_TRAINING,
          },
        }),
        this.prisma.mockInterview.count({
          where: {
            coordinatorId,
            decision: MOCK_INTERVIEW_DECISION.REJECTED,
          },
        }),
      ]);

    return {
      total,
      completed,
      pending,
      byDecision: {
        approved,
        needsTraining,
        rejected,
      },
      approvalRate:
        completed > 0 ? ((approved / completed) * 100).toFixed(2) : '0',
    };
  }

  /**
   * Return candidate-project assignments that were set to 'mock_interview_assigned',
   * ordered by the most recent history entry (statusChangedAt) for that sub-status.
   * This ensures the "latest assignment" appears first.
   */
  async getAssignedCandidateProjects(query: any) {
    
    const { page = 1, limit = 10, projectId, candidateId, recruiterId } = query;

    const historyWhere: any = {
      subStatus: { is: { name: 'mock_interview_assigned' } },
    };

    if (projectId) historyWhere.candidateProjectMap = { is: { projectId } };
    if (candidateId) historyWhere.candidateProjectMap = { ...(historyWhere.candidateProjectMap?.is ?? {}), candidateId };
    if (recruiterId) historyWhere.candidateProjectMap = { ...(historyWhere.candidateProjectMap?.is ?? {}), recruiterId };

    const histories = await this.prisma.candidateProjectStatusHistory.findMany({
      where: historyWhere,
      orderBy: { statusChangedAt: 'desc' },
      include: {
        candidateProjectMap: {
          include: {
            candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
            project: { select: { id: true, title: true } },
            roleNeeded: { select: { id: true, designation: true } },
            recruiter: { select: { id: true, name: true, email: true } },
            mainStatus: true,
            subStatus: true,
          },
        },
      },
    });

    // unique preserve order
    const seen = new Set<string>();
    const ordered: any[] = [];
    for (const h of histories) {
      const id = h.candidateProjectMapId;
      if (!seen.has(id)) {
        seen.add(id);
        ordered.push({ map: h.candidateProjectMap, assignedAt: h.statusChangedAt });
      }
    }

    const total = ordered.length;
    const start = (page - 1) * limit;
    const paged = ordered.slice(start, start + limit);

    return {
      success: true,
      data: {
        // include assignedAt (from status history) so frontend can show the exact assignment timestamp
        items: paged.map((p) => ({ ...p.map, assignedAt: p.assignedAt })),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      },
      message: 'Assigned candidate-projects for mock interviews (latest first)',
    };
  }
}
