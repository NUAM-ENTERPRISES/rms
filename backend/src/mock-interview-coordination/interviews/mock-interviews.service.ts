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
  MOCK_INTERVIEW_STATUS,
} from '../../common/constants/statuses';

@Injectable()
export class MockInterviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create/Schedule a new mock interview
   */
  async create(dto: CreateMockInterviewDto, scheduledBy?: string | null) {
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

    // Verify template exists if provided
    // if (dto.templateId) {
    //   const template = await this.prisma.mockInterviewTemplate.findUnique({
    //     where: { id: dto.templateId },
    //   });
    //   if (!template) {
    //     throw new NotFoundException(
    //       `Template with ID "${dto.templateId}" not found`,
    //     );
    //   }
    //   // Verify template is for the same role as candidate's roleNeeded
    //   if (candidateProject.roleNeeded) {
    //     // Get roleCatalog from roleNeeded.designation
    //     const roleCatalog = await this.prisma.roleCatalog.findFirst({
    //       where: {
    //         name: {
    //           equals: candidateProject.roleNeeded.designation,
    //           mode: 'insensitive',
    //         },
    //       },
    //     });
    //     if (roleCatalog && template.roleId !== roleCatalog.id) {
    //       throw new BadRequestException(
    //         'Template role does not match candidate role',
    //       );
    //     }
    //   }
    // }

    // Create the mock interview, update candidate sub-status, and write history
    // in a single transaction to keep data consistent.
    // Resolve scheduler name (if scheduledBy provided) so we can record a human-friendly
    // changedByName in history entries. If scheduledBy isn't provided, fall back to
    // the coordinator's name we already loaded.
    let schedulerName: string | null = null;
    if (scheduledBy) {
      const scheduler = await this.prisma.user.findUnique({ where: { id: scheduledBy } });
      schedulerName = scheduler?.name ?? null;
    }

    const created = await this.prisma.$transaction(async (tx) => {
      // Re-validate template inside the transaction to avoid a race where a template
      // could be deleted between the initial check above and the create call.
      if (dto.templateId) {
        const txTemplate = await tx.mockInterviewTemplate.findUnique({ where: { id: dto.templateId } });
        if (!txTemplate) {
          throw new NotFoundException(`Template with ID "${dto.templateId}" not found`);
        }
        // Verify template role (do this inside tx as well for consistency)
        if (candidateProject.roleNeeded) {
          const roleCatalog = await tx.roleCatalog.findFirst({
            where: {
              name: { equals: candidateProject.roleNeeded.designation, mode: 'insensitive' },
            },
          });
          if (roleCatalog && txTemplate.roleId !== roleCatalog.id) {
            throw new BadRequestException('Template role does not match candidate role');
          }
        }
      }
      let mockInterview: any;
      try {
        mockInterview = await tx.mockInterview.create({
        data: {
          candidateProjectMapId: dto.candidateProjectMapId,
          coordinatorId: dto.coordinatorId,
          // templateId: dto.templateId,
          scheduledTime: dto.scheduledTime ? new Date(dto.scheduledTime) : null,
          duration: dto.duration ?? 60,
          meetingLink: dto.meetingLink,
          mode: dto.mode ?? 'video',
          status: MOCK_INTERVIEW_STATUS.SCHEDULED,
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
      } catch (e: any) {
        // Translate common FK constraint failures into clear HTTP exceptions
        // to avoid leaking Prisma errors to the client.
        if (e?.code === 'P2003' && e?.meta?.constraint) {
          const constraint: string = e.meta.constraint;
          if (constraint.includes('templateId')) {
            throw new NotFoundException(`Template with ID "${dto.templateId}" not found`);
          }
          if (constraint.includes('candidateProjectMapId')) {
            throw new NotFoundException(`Candidate-Project with ID "${dto.candidateProjectMapId}" not found`);
          }
          if (constraint.includes('coordinatorId')) {
            throw new NotFoundException(`Coordinator with ID "${dto.coordinatorId}" not found`);
          }
        }
        // Re-throw unknown errors
        throw e;
      }

      // Update candidate-project status to MOCK_INTERVIEW_SCHEDULED (use constant)
      await tx.candidateProjects.update({
        where: { id: dto.candidateProjectMapId },
        data: {
          subStatus: {
            connect: { name: CANDIDATE_PROJECT_STATUS.MOCK_INTERVIEW_SCHEDULED },
          },
        },
      });

      // Create candidate-project status history entry
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId: dto.candidateProjectMapId,
          // store the status *name* as the snapshot (consistent with other history records)
          subStatusSnapshot: 'Mock Interview Scheduled',
          // Prefer the scheduler user id if provided, otherwise fall back to coordinatorId
          changedById: scheduledBy ?? dto.coordinatorId ?? null,
          // Use resolved schedulerName when available; otherwise coordinator.name
          changedByName: schedulerName ?? coordinator.name ?? null,
          reason: `Mock interview scheduled${schedulerName ? ` by ${schedulerName}` : dto.coordinatorId ? ` with coordinator ${coordinator.name}` : ''}`,
        },
      });

      // Create an interview-level status history record (supports mock & main interviews)
      await tx.interviewStatusHistory.create({
        data: {
          interviewType: 'mock',
          interviewId: mockInterview.id,
          candidateProjectMapId: dto.candidateProjectMapId,
          previousStatus: null, // No previous status on creation
          status: 'scheduled',
          statusSnapshot: 'Mock Interview Scheduled',
          statusAt: new Date(),
          changedById: scheduledBy ?? dto.coordinatorId ?? null,
          changedByName: schedulerName ?? coordinator.name ?? null,
          reason: `Mock interview scheduled${schedulerName ? ` by ${schedulerName}` : dto.coordinatorId ? ` with coordinator ${coordinator.name}` : ''}`,
        },
      });

      return mockInterview;
    });

    // Return the enriched, canonical object via existing read method
    return this.findOne(created.id);
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
            mainStatus: true,
            subStatus: true,
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
              // Ensure callers get the current main/sub status on the candidate-project map
              mainStatus: true,
              subStatus: true,
            },
          },
        template: {
          include: {
            items: {
              orderBy: [{ category: 'asc' }, { order: 'asc' }],
            },
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

    // Find matching RoleCatalog by matching roleNeeded.designation to roleCatalog.name
    let roleCatalog: {
      id: string;
      name: string;
      slug: string;
      category: string;
    } | null = null;
    if (interview.candidateProjectMap?.roleNeeded?.designation) {
      roleCatalog = await this.prisma.roleCatalog.findFirst({
        where: {
          name: {
            equals: interview.candidateProjectMap.roleNeeded.designation,
            mode: 'insensitive',
          },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          category: true,
        },
      });
    }

    // Add roleCatalog to the response
    return {
      ...interview,
      candidateProjectMap: {
        ...interview.candidateProjectMap,
        roleCatalog,
      },
    };
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

    // Make the update in a transaction so we can write an interview-level history entry
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedInterview = await tx.mockInterview.update({
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
              // include statuses in updates/reads
              mainStatus: true,
              subStatus: true,
            },
          },
        },
      });

      // Determine status change for scheduling
      const previousStatus = existing.scheduledTime ? 'scheduled' : null;
      let newStatus: string | null = null;
      if (dto.scheduledTime) {
        // scheduling or rescheduling
        newStatus = existing.scheduledTime ? 'rescheduled' : 'scheduled';
      } else if (!dto.scheduledTime && existing.scheduledTime) {
        // unscheduling/cleared scheduled time
        newStatus = 'unscheduled';
      }

      if (newStatus) {
        await tx.interviewStatusHistory.create({
          data: {
            interviewType: 'mock',
            interviewId: id,
            candidateProjectMapId: existing.candidateProjectMapId,
            previousStatus: previousStatus,
            status: newStatus,
            statusSnapshot:
              newStatus === 'rescheduled'
                ? 'Mock Interview Rescheduled'
                : newStatus === 'unscheduled'
                ? 'Mock Interview Unscheduling'
                : 'Mock Interview Scheduled',
            statusAt: new Date(),
            // update endpoint does not currently pass user info through controller
            changedById: null,
            changedByName: null,
            reason: dto.meetingLink ? `Updated meeting link` : undefined,
          },
        });
      }

      return updatedInterview;
    });

    return updated;
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
            templateItemId: item.templateItemId, // Link to template item if from template
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

      // Apply the sub-status update and capture the updated map so we can create
      // a correct history record (we need the actual subStatus.id, not the name)
      const updatedMap = await tx.candidateProjects.update({
        where: { id: existing.candidateProjectMapId },
        data: statusUpdate,
        include: { subStatus: true, mainStatus: true },
      });

      // Create status history entry using accurate snapshot + FK id
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId: existing.candidateProjectMapId,
          subStatusId: updatedMap.subStatus?.id ?? null,
          subStatusSnapshot: updatedMap.subStatus?.name ?? null,
          changedById: userId,
          reason: `Mock interview ${dto.decision}`,
          notes: dto.remarks,
        },
      });

      // Create interview-level status history entry for completion
      // Determine previous status at interview-level
      const previousStatus = existing.scheduledTime ? 'scheduled' : null;
      const actor = await tx.user.findUnique({ where: { id: userId } });
      await tx.interviewStatusHistory.create({
        data: {
          interviewType: 'mock',
          interviewId: id,
          candidateProjectMapId: existing.candidateProjectMapId,
          previousStatus: previousStatus,
          status: 'completed',
          statusSnapshot: 'Mock Interview Completed',
          statusAt: new Date(),
          changedById: userId,
          changedByName: actor?.name ?? null,
          reason: dto.remarks ?? `Mock interview completed by ${actor?.name ?? userId}`,
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
    const { page = 1, limit = 10, projectId, candidateId, recruiterId, search } = query;

    const where: any = {
      subStatus: { is: { name: 'mock_interview_assigned' } },
    };

    if (projectId) where.projectId = projectId;
    if (candidateId) where.candidateId = candidateId;
    if (recruiterId) where.recruiterId = recruiterId;

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const s = search.trim();
      where.OR = [
        { id: { contains: s, mode: 'insensitive' } },
        { candidate: { firstName: { contains: s, mode: 'insensitive' } } },
        { candidate: { lastName: { contains: s, mode: 'insensitive' } } },
        { candidate: { email: { contains: s, mode: 'insensitive' } } },
        { project: { title: { contains: s, mode: 'insensitive' } } },
        { roleNeeded: { designation: { contains: s, mode: 'insensitive' } } },
      ];
    }

    // Count total matching maps for pagination
    const total = await this.prisma.candidateProjects.count({ where });

    // Get paginated candidate-project maps ordered by assignment time (most recent first)
    const items = await this.prisma.candidateProjects.findMany({
      where,
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, title: true } },
        roleNeeded: { select: { id: true, designation: true } },
        recruiter: { select: { id: true, name: true, email: true } },
        mainStatus: true,
        subStatus: true,
      },
      orderBy: { assignedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      success: true,
      data: {
        items: items.map((it) => ({ ...it, assignedAt: it.assignedAt })),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      },
      message: 'Assigned candidate-projects for mock interviews (latest first)',
    };
  }

  /**
   * Return upcoming mock interviews (status = scheduled) ordered by scheduledTime ASC
   */
  async getUpcoming(query: any) {
    const { page = 1, limit = 20, coordinatorId, candidateProjectMapId, projectId, search } = query;

    // Return all scheduled mock interviews (don't exclude past times).
    // The UI needs to display expired (past) scheduled interviews too, so we'll
    // compute isExpired per-item below instead of filtering them out here.
    const where: any = {
      status: MOCK_INTERVIEW_STATUS.SCHEDULED,
    };

    if (coordinatorId) where.coordinatorId = coordinatorId;
    if (candidateProjectMapId) where.candidateProjectMapId = candidateProjectMapId;
    if (projectId) where.candidateProjectMap = { projectId };

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const s = search.trim();
      where.OR = [
        { candidateProjectMap: { id: { contains: s, mode: 'insensitive' } } },
        { candidateProjectMap: { candidate: { firstName: { contains: s, mode: 'insensitive' } } } },
        { candidateProjectMap: { candidate: { lastName: { contains: s, mode: 'insensitive' } } } },
        { candidateProjectMap: { candidate: { email: { contains: s, mode: 'insensitive' } } } },
        { candidateProjectMap: { project: { title: { contains: s, mode: 'insensitive' } } } },
        { candidateProjectMap: { roleNeeded: { designation: { contains: s, mode: 'insensitive' } } } },
      ];
    }

    const total = await this.prisma.mockInterview.count({ where });

    const items = await this.prisma.mockInterview.findMany({
      where,
      include: {
        candidateProjectMap: {
          include: {
            candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
            project: { select: { id: true, title: true } },
            roleNeeded: { select: { id: true, designation: true } },
            mainStatus: true,
            subStatus: true,
          },
        },
      },
      orderBy: { scheduledTime: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Add an isExpired flag so caller/UI can render past scheduled interviews
    // differently. Treat null scheduledTime as not expired.
    const now = new Date();
    const itemsWithExpired = items.map((it) => ({
      ...it,
      isExpired: it.scheduledTime ? new Date(it.scheduledTime) < now : false,
    }));

    return {
      success: true,
      data: {
        items: itemsWithExpired,
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      },
      message: 'Upcoming mock interviews (scheduled earliest first)',
    };
  }
}
