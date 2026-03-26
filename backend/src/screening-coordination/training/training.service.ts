import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CandidateProjectsService } from '../../candidate-projects/candidate-projects.service';
import { CreateTrainingAssignmentDto } from './dto/create-training.dto';
import { UpdateTrainingAssignmentDto } from './dto/update-training.dto';
import { CompleteTrainingDto } from './dto/complete-training.dto';
import { CreateTrainingSessionDto } from './dto/create-session.dto';
import { CompleteTrainingSessionDto } from './dto/complete-session.dto';
import { BulkCreateSessionsDto } from './dto/bulk-create-sessions.dto';
import { BulkCompleteSessionsDto } from './dto/bulk-complete-sessions.dto';
import { QueryTrainingAssignmentsDto } from './dto/query-training.dto';
import {
  CANDIDATE_PROJECT_STATUS,
  TRAINING_STATUS,
} from '../../common/constants/statuses';

@Injectable()
export class TrainingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly candidateProjectsService: CandidateProjectsService,
  ) {}

  // ==================== Training Assignments ====================

  /**
   * Create a new training assignment
   */
  async createAssignment(dto: CreateTrainingAssignmentDto) {
    // Verify candidate-project exists
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id: dto.candidateProjectMapId },
      include: {
        candidate: {
          select: { firstName: true, lastName: true },
        },
        project: { select: { title: true } },
      },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        `Candidate-Project with ID "${dto.candidateProjectMapId}" not found`,
      );
    }

    // Verify assignedBy user exists
    const assignedByUser = await this.prisma.user.findUnique({
      where: { id: dto.assignedBy },
    });

    if (!assignedByUser) {
      throw new NotFoundException(
        `User with ID "${dto.assignedBy}" not found`,
      );
    }

    // If a screening ID (or legacy screeningId) is provided, verify it exists
    const rawScreeningId = (dto as any).screeningId ?? (dto as any).screeningId;
    if (rawScreeningId) {
      const screeningId = rawScreeningId;
      const screening = await this.prisma.screening.findUnique({ where: { id: screeningId } });

      if (!screening) {
        throw new NotFoundException(`Screening with ID "${screeningId}" not found`);
      }

      // Normalize DTO to use screeningId going forward
      (dto as any).screeningId = screeningId;
    }

    // Create training assignment in transaction
    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.trainingAssignment.create({
        data: {
          candidateProjectMapId: dto.candidateProjectMapId,
          screeningId: (dto as any).screeningId ?? (dto as any).screeningId,
          assignedBy: dto.assignedBy,
          trainerId: (dto as any).trainerId ?? dto.assignedBy,
          trainingType: dto.trainingType,
          focusAreas: dto.focusAreas,
          priority: dto.priority ?? 'medium',
          targetCompletionDate: dto.targetCompletionDate
            ? new Date(dto.targetCompletionDate)
            : null,
          // 'notes' is not part of the interviewStatusHistory model; omit it
        },
        include: {
          candidateProjectMap: {
            include: {
              candidate: {
                select: { firstName: true, lastName: true, email: true, countryCode: true, mobileNumber: true },
              },
              project: { select: { title: true } },
            },
          },
        },
      });

      // If a screening was provided, mark it as assigned to a trainer
      if ((dto as any).screeningId) {
        // Cast to any because generated Prisma types may be out-of-date in some environments
        await tx.screening.update({
          where: { id: (dto as any).screeningId },
          data: { isAssignedTrainer: true } as any,
        });
      }

      // Update candidate-project status to training_assigned
      await tx.candidateProjects.update({
        where: { id: dto.candidateProjectMapId },
        data: {
          subStatus: {
            connect: {
              name: CANDIDATE_PROJECT_STATUS.TRAINING_ASSIGNED,
            },
          },
        },
      });

      // Create status history entry
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId: dto.candidateProjectMapId,
          subStatusSnapshot: CANDIDATE_PROJECT_STATUS.TRAINING_ASSIGNED,
          changedById: dto.assignedBy,
          reason: 'Training assigned after screening',
        },
      });

      // Create an interview-level status history record for training assignment
      await tx.interviewStatusHistory.create({
        data: {
          interviewType: 'screening',
          interviewId: (dto as any).screeningId ?? null,
          candidateProjectMapId: dto.candidateProjectMapId,
          previousStatus: null,
          status: CANDIDATE_PROJECT_STATUS.TRAINING_ASSIGNED,
          statusSnapshot: 'Training Assigned',
          statusAt: new Date(),
          changedById: dto.assignedBy,
          changedByName: assignedByUser?.name ?? null,
          reason: 'Training assigned after screening',
        },
      });

      // Add combined phone to candidate contact and attach assignedBy user details if available
      const candidate = assignment.candidateProjectMap?.candidate
        ? {
            ...assignment.candidateProjectMap.candidate,
            phone: `${assignment.candidateProjectMap.candidate.countryCode ?? ''} ${assignment.candidateProjectMap.candidate.mobileNumber ?? ''}`.trim(),
          }
        : null;

      let assigner: any = null;
      if (dto.assignedBy) {
        assigner = await tx.user.findUnique({ where: { id: dto.assignedBy }, select: { id: true, name: true, email: true } });
      }

      const assignmentAny = assignment as any;
      return {
        ...assignmentAny,
        candidateProjectMap: {
          ...assignmentAny.candidateProjectMap,
          candidate,
        },
        assignedBy: assigner ?? assignmentAny.assignedBy,
      };
    });
  }

  /**
   * Find all training assignments
   */
  async findAllAssignments(query: QueryTrainingAssignmentsDto) {
    const where: any = {};

    if (query.candidateProjectMapId) {
      where.candidateProjectMapId = query.candidateProjectMapId;
    }

    if (query.assignedBy) {
      where.assignedBy = query.assignedBy;
    }

    if (query.status) {
      where.status = query.status;
    }

    // Exclude basic training entries that are not linked to a screening
    // i.e., trainingType === 'basic' AND screeningId IS NULL should not be returned by default
    where.NOT = { trainingType: 'basic', screeningId: null };

    const items = await this.prisma.trainingAssignment.findMany({
      where,
      include: {
        screening: {
          select: {
            id: true,
            conductedAt: true,
            decision: true,
            overallRating: true,
            remarks: true,
            areasOfImprovement: true,
          },
        },
        candidateProjectMap: {
          include: {
            candidate: {
              select: { id: true, firstName: true, lastName: true, email: true, countryCode: true, mobileNumber: true },
            },
              // Include full project details for basic assignments per request
              project: {
                include: {
                  client: true,
                  country: true,
                  creator: { select: { id: true, name: true, email: true } },
                  team: true,
                },
              },
            roleNeeded: true,
          },
        },
        trainingSessions: {
          orderBy: { sessionDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add combined phone to candidate contact and batch fetch assigner users and attach their info to assignments
    const itemsWithCandidateContact = items.map((it) => ({
      ...it,
      candidateProjectMap: {
        ...it.candidateProjectMap,
        candidate: it.candidateProjectMap?.candidate
          ? { 
              ...it.candidateProjectMap.candidate, 
              phone: `${(it.candidateProjectMap.candidate as any).countryCode ?? ''} ${(it.candidateProjectMap.candidate as any).mobileNumber ?? ''}`.trim() 
            }
          : null,
      },
    }));
    // Batch fetch assigner and trainer users and attach their info to assignments
    const userIds = Array.from(new Set([
      ...items.map((it) => it.assignedBy).filter(Boolean),
      ...items.map((it) => (it as any).trainerId).filter(Boolean),
    ]));
    let usersById: Record<string, any> = {};
    if (userIds.length > 0) {
      const users = await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } });
      usersById = users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {} as Record<string, any>);
    }

    // Build training number per candidateProjectMapId (1-based order by assignedAt)
    const grouping: Record<string, any[]> = {};
    itemsWithCandidateContact.forEach((it: any) => {
      const cpm = it.candidateProjectMap?.id;
      if (!cpm) return;
      if (!grouping[cpm]) grouping[cpm] = [];
      grouping[cpm].push(it);
    });
    Object.values(grouping).forEach((list) => {
      list.sort((a, b) => new Date(a.assignedAt).getTime() - new Date(b.assignedAt).getTime());
      list.forEach((item: any, index: number) => {
        item.trainingAttempt = index + 1;
        item.trainingAttemptTotal = list.length;
      });
    });

    return itemsWithCandidateContact.map((it: any) => ({
      ...it,
      assignedBy: usersById[it.assignedBy] ?? it.assignedBy,
      trainer: it.trainerId ? usersById[it.trainerId] ?? { id: it.trainerId } : null,
    }));
  }

  /**
  * Find basic training assignments (trainingType === 'basic' and screeningId IS NULL)
   * Supports pagination and search by candidate name or project title
   */
  async findAllBasicTrainings(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      trainingType: 'basic',
      screeningId: null,
    };

    if (query.assignedBy) {
      where.assignedBy = query.assignedBy;
    }

    if (query.status) {
      where.status = query.status;
    }

    // Search across candidate first/last name and project title
    if (query.search) {
      const s = query.search;
      where.OR = [
        { candidateProjectMap: { candidate: { firstName: { contains: s, mode: 'insensitive' } } } },
        { candidateProjectMap: { candidate: { lastName: { contains: s, mode: 'insensitive' } } } },
        { candidateProjectMap: { project: { title: { contains: s, mode: 'insensitive' } } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.trainingAssignment.findMany({
        where,
        include: {
          candidateProjectMap: {
            include: {
              candidate: {
                select: { id: true, firstName: true, lastName: true, email: true, countryCode: true, mobileNumber: true },
              },
              // Return full project details for basic training assignment listing
              project: {
                include: {
                  client: true,
                  country: true,
                  creator: { select: { id: true, name: true, email: true } },
                  team: true,
                  rolesNeeded: true,
                },
              },
              roleNeeded: { select: { designation: true } },
            },
          },
          trainingSessions: { orderBy: { sessionDate: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.trainingAssignment.count({ where }),
    ]);

    // Add candidate phone and attach assignedBy user details (batch)
    const itemsWithCandidateContact = items.map((it) => ({
      ...(it as any),
      candidateProjectMap: {
        ...it.candidateProjectMap,
        candidate: it.candidateProjectMap?.candidate
          ? { ...it.candidateProjectMap.candidate, phone: `${it.candidateProjectMap.candidate.countryCode ?? ''} ${it.candidateProjectMap.candidate.mobileNumber ?? ''}`.trim() }
          : null,
      },
    }));

    const assignerIds = Array.from(new Set(items.map((it) => it.assignedBy).filter(Boolean)));
    let usersById: Record<string, any> = {};
    if (assignerIds.length > 0) {
      const users = await this.prisma.user.findMany({ where: { id: { in: assignerIds } }, select: { id: true, name: true, email: true } });
      usersById = users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {} as Record<string, any>);
    }

    return {
      items: itemsWithCandidateContact.map((it) => ({ ...(it as any), assignedBy: usersById[it.assignedBy] ?? it.assignedBy })),
      total,
      page,
      limit,
    };
  }

  /**
   * Find a single training assignment
   */
  async findOneAssignment(id: string) {
    const assignment = await this.prisma.trainingAssignment.findUnique({
      where: { id },
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
        screening: {
          select: {
            id: true,
            conductedAt: true,
            decision: true,
            overallRating: true,
          },
        },
        trainingSessions: {
          orderBy: { sessionDate: 'desc' },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Training Assignment with ID "${id}" not found`);
    }

    // Attach assignedBy user details if present and compute candidate phone
    const candidate = (assignment as any).candidateProjectMap?.candidate
      ? {
          ...(assignment as any).candidateProjectMap.candidate,
          phone: `${((assignment as any).candidateProjectMap.candidate as any).countryCode ?? ''} ${((assignment as any).candidateProjectMap.candidate as any).mobileNumber ?? ''}`.trim(),
        }
      : null;

    if (!assignment) {
      throw new NotFoundException(`Training Assignment with ID "${id}" not found`);
    }

    if (assignment.assignedBy) {
      const user = await this.prisma.user.findUnique({ where: { id: assignment.assignedBy }, select: { id: true, name: true, email: true } });
      return user
        ? { ...(assignment as any), assignedBy: user, candidateProjectMap: { ...((assignment as any).candidateProjectMap), candidate } }
        : { ...(assignment as any), candidateProjectMap: { ...((assignment as any).candidateProjectMap), candidate } };
    }

    return { ...(assignment as any), candidateProjectMap: { ...((assignment as any).candidateProjectMap), candidate } };
  }

  /**
   * Update a training assignment
   */
  async updateAssignment(id: string, dto: UpdateTrainingAssignmentDto) {
    await this.findOneAssignment(id);

    return this.prisma.trainingAssignment.update({
      where: { id },
      data: {
        trainingType: dto.trainingType,
        focusAreas: dto.focusAreas,
        priority: dto.priority,
        targetCompletionDate: dto.targetCompletionDate
          ? new Date(dto.targetCompletionDate)
          : undefined,
        notes: dto.notes,
        assignedBy: dto.assignedBy,
      },
      include: {
        candidateProjectMap: {
          include: {
            candidate: {
              select: { firstName: true, lastName: true, email: true, countryCode: true, mobileNumber: true },
            },
            project: { select: { title: true } },
          },
        },
      },
    });
  }

  /**
   * Start training (update status to in_progress)
   */
  async startTraining(id: string, userId: string) {
    const assignment = await this.findOneAssignment(id);

    if (assignment!.status !== TRAINING_STATUS.ASSIGNED && assignment!.status !== TRAINING_STATUS.SCHEDULED) {
      throw new BadRequestException(
        `Training cannot be started. Current status: ${assignment!.status}`,
      );
    }

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(
        `User with ID "${userId}" not found`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.trainingAssignment.update({
        where: { id },
        data: {
          status: TRAINING_STATUS.IN_PROGRESS,
          startedAt: new Date(),
        },
      });

      // Update candidate-project status
      await tx.candidateProjects.update({
        where: { id: assignment!.candidateProjectMapId },
        data: {
          subStatus: {
            connect: {
              name: CANDIDATE_PROJECT_STATUS.TRAINING_IN_PROGRESS,
            },
          },
        },
      });

      // Create status history
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId: assignment!.candidateProjectMapId,
          subStatusSnapshot: CANDIDATE_PROJECT_STATUS.TRAINING_IN_PROGRESS,
          changedById: userId,
          reason: 'Training started',
        },
      });

      // Create interview-level status history record for training start
      await tx.interviewStatusHistory.create({
        data: {
          interviewType: 'screening',
          interviewId: assignment!.screeningId ?? null,
          candidateProjectMapId: assignment!.candidateProjectMapId,
          previousStatus: 'training_assigned',
          status: CANDIDATE_PROJECT_STATUS.TRAINING_IN_PROGRESS,
          statusSnapshot: 'Training In Progress',
          statusAt: new Date(),
          changedById: userId,
          changedByName: user?.name ?? null,
          reason: 'Training started',
        },
      });

      return updated;
    });
  }

  /**
   * Complete a training assignment
   */
  async completeTraining(id: string, dto: CompleteTrainingDto, userId: string) {
    const assignment = await this.findOneAssignment(id);

    if (assignment!.status === TRAINING_STATUS.COMPLETED) {
      throw new BadRequestException('Training is already completed');
    }

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(
        `User with ID "${userId}" not found`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.trainingAssignment.update({
        where: { id },
        data: {
          status: TRAINING_STATUS.COMPLETED,
          completedAt: new Date(),
          notes: dto.notes ?? assignment!.notes,
          improvementNotes: dto.improvementNotes,
        },
      });

      // Update candidate-project status to training_completed
      await tx.candidateProjects.update({
        where: { id: assignment!.candidateProjectMapId },
        data: {
          subStatus: {
            connect: {
              name: CANDIDATE_PROJECT_STATUS.TRAINING_COMPLETED,
            },
          },
        },
      });

      // Create status history
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId: assignment!.candidateProjectMapId,
          subStatusSnapshot: CANDIDATE_PROJECT_STATUS.TRAINING_COMPLETED,
          changedById: userId,
          reason: 'Training completed',
          notes: dto.improvementNotes,
        },
      });

      // Create interview-level status history record for training completion
      await tx.interviewStatusHistory.create({
        data: {
          interviewType: 'screening',
          interviewId: assignment!.screeningId ?? null,
          candidateProjectMapId: assignment!.candidateProjectMapId,
          previousStatus: 'training_assigned',
          status: CANDIDATE_PROJECT_STATUS.TRAINING_COMPLETED,
          statusSnapshot: 'Training Completed',
          statusAt: new Date(),
          changedById: userId,
          changedByName: user?.name ?? null,
          reason: 'Training completed',
        },
      });

      return updated;
    });
  }

  /**
   * Mark candidate as ready for reassessment
   */
  async markReadyForReassessment(id: string, userId: string) {
    const assignment = await this.findOneAssignment(id);

    if (assignment!.status !== TRAINING_STATUS.COMPLETED) {
      throw new BadRequestException(
        'Training must be completed before marking ready for reassessment',
      );
    }

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(
        `User with ID "${userId}" not found`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Update candidate-project status
      await tx.candidateProjects.update({
        where: { id: assignment!.candidateProjectMapId },
        data: {
          subStatus: {
            connect: {
              name: CANDIDATE_PROJECT_STATUS.READY_FOR_REASSESSMENT,
            },
          },
        },
      });

      // Create status history
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId: assignment!.candidateProjectMapId,
          subStatusSnapshot: CANDIDATE_PROJECT_STATUS.READY_FOR_REASSESSMENT,
          changedById: userId,
          reason: 'Candidate ready for screening reassessment',
        },
      });

      // Create interview-level status history record for ready-for-reassessment
      await tx.interviewStatusHistory.create({
        data: {
          interviewType: 'screening',
          interviewId: assignment!.screeningId ?? null,
          candidateProjectMapId: assignment!.candidateProjectMapId,
          previousStatus: CANDIDATE_PROJECT_STATUS.TRAINING_COMPLETED,
          status: CANDIDATE_PROJECT_STATUS.READY_FOR_REASSESSMENT,
          statusSnapshot: 'Ready for Reassessment',
          statusAt: new Date(),
          changedById: userId,
          changedByName: user?.name ?? null,
          reason: 'Candidate ready for screening reassessment',
        },
      });

      return {
        success: true,
        message: 'Candidate marked ready for reassessment',
      };
    });
  }

  /**
   * Delete a training assignment
   */
  async removeAssignment(id: string) {
    await this.findOneAssignment(id);

    await this.prisma.trainingAssignment.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Training assignment deleted successfully',
    };
  }

  // ==================== Training Sessions ====================

  /**
   * Create a training session
   */
  async createSession(dto: CreateTrainingSessionDto, userId?: string) {
    // Verify training assignment exists
    const assignment = await this.findOneAssignment(dto.trainingAssignmentId);

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.trainingSession.create({
        data: {
          trainingAssignmentId: dto.trainingAssignmentId,
          sessionDate: new Date(dto.sessionDate),
          sessionType: dto.sessionType || 'video',
          duration: dto.duration || 60,
          topicsCovered: dto.topicsCovered || [],
          plannedActivities: dto.plannedActivities,
          trainer: dto.trainer,
          meetingLink: dto.meetingLink,
        },
      });

      // Automatically update candidate project status to training_scheduled
      if (assignment.candidateProjectMapId && userId) {
        // Also ensure trainingAssignment status is set to scheduled for any non-final state
        if (
          assignment.status !== TRAINING_STATUS.COMPLETED &&
          assignment.status !== TRAINING_STATUS.CANCELLED
        ) {
          await tx.trainingAssignment.update({
            where: { id: assignment.id },
            data: { status: TRAINING_STATUS.SCHEDULED },
          });
        }

        // Use connect pattern for subStatus to ensure all relations are correctly handled
        await tx.candidateProjects.update({
          where: { id: assignment.candidateProjectMapId },
          data: {
            subStatus: {
              connect: { name: CANDIDATE_PROJECT_STATUS.TRAINING_SCHEDULED },
            },
          },
        });

        const subStatus = await tx.candidateProjectSubStatus.findUnique({
          where: { name: CANDIDATE_PROJECT_STATUS.TRAINING_SCHEDULED },
          include: { stage: true },
        });

        if (subStatus) {
          const user = await tx.user.findUnique({
            where: { id: userId },
            select: { name: true },
          });

          // Create generic project status history
          await tx.candidateProjectStatusHistory.create({
            data: {
              candidateProjectMapId: assignment.candidateProjectMapId,
              mainStatusId: subStatus.stageId,
              subStatusId: subStatus.id,
              mainStatusSnapshot: subStatus.stage.label,
              subStatusSnapshot: subStatus.label,
              changedById: userId,
              changedByName: user?.name || 'System',
              reason: 'Training session scheduled',
              notes: `Training session scheduled for ${new Date(
                dto.sessionDate,
              ).toLocaleString()}`,
            },
          });

          await tx.interviewStatusHistory.create({
            data: {
              interviewType: 'training',
              interviewId: assignment.id, // Link to the training assignment
              candidateProjectMapId: assignment.candidateProjectMapId,
              status: CANDIDATE_PROJECT_STATUS.TRAINING_SCHEDULED,
              statusSnapshot: 'Training Scheduled',
              statusAt: new Date(),
              changedById: userId,
              changedByName: user?.name || 'System',
              reason: `Training session scheduled for ${new Date(
                dto.sessionDate,
              ).toLocaleString()}`,
            },
          });
        }
      }

      return session;
    });
  }

  /**
   * Bulk create training sessions
   */
  async bulkCreateSessions(dto: BulkCreateSessionsDto, userId: string) {
    const results: any[] = [];

    for (const assignmentId of dto.trainingAssignmentIds) {
      try {
        const session = await this.createSession(
          {
            trainingAssignmentId: assignmentId,
            sessionDate: dto.sessionDate,
            duration: dto.duration,
            sessionType: (dto.mode as any) || "video",
            trainer: userId, // Default trainer to current user
            topicsCovered: dto.topic ? [dto.topic] : [],
            meetingLink: dto.meetingLink,
          },
          userId,
        );
        results.push(session);

        // Update training assignment status to scheduled and candidate-project substatus to training_scheduled
        const assignment = await this.prisma.trainingAssignment.findUnique({
          where: { id: assignmentId },
          select: { status: true, candidateProjectMapId: true },
        });

        if (
          assignment &&
          assignment.status !== TRAINING_STATUS.COMPLETED &&
          assignment.status !== TRAINING_STATUS.CANCELLED
        ) {
          await this.prisma.trainingAssignment.update({
            where: { id: assignmentId },
            data: { status: TRAINING_STATUS.SCHEDULED },
          });

          // Also update candidate project substatus
          await this.prisma.candidateProjects.update({
            where: { id: assignment.candidateProjectMapId },
            data: {
              subStatus: {
                connect: {
                  name: CANDIDATE_PROJECT_STATUS.TRAINING_SCHEDULED,
                },
              },
            },
          });

          // Record status history
          await this.prisma.candidateProjectStatusHistory.create({
            data: {
              candidateProjectMapId: assignment.candidateProjectMapId,
              subStatusSnapshot: CANDIDATE_PROJECT_STATUS.TRAINING_SCHEDULED,
              changedById: userId,
              reason: 'Training scheduled',
              notes: `Session scheduled for ${new Date(dto.sessionDate).toLocaleDateString()}`,
            },
          });
        }
      } catch (error) {
        console.error(`Failed to create session for assignment ${assignmentId}:`, error);
      }
    }

    return results;
  }

  /**
   * Bulk complete training sessions
   */
  async bulkCompleteSessions(dto: BulkCompleteSessionsDto, userId: string) {
    const results: any[] = [];

    // Process each session completion in a separate transaction to ensure atomicity for each candidate
    for (const item of dto.sessions) {
      try {
        const assignmentId = item.sessionId.startsWith('new-')
          ? item.sessionId.replace('new-', '')
          : (
              await this.prisma.trainingSession.findUnique({
                where: { id: item.sessionId },
                select: { trainingAssignmentId: true },
              })
            )?.trainingAssignmentId;

        if (!assignmentId) continue;

        const session = await this.prisma.$transaction(async (tx) => {
          // Find if a session already exists for this assignment
          const existingSession = await tx.trainingSession.findFirst({
            where: { trainingAssignmentId: assignmentId },
          });

          let updatedSession;
          if (existingSession) {
            updatedSession = await tx.trainingSession.update({
              where: { id: existingSession.id },
              data: {
                completedAt: new Date(),
                performanceRating:
                  item.performanceRating !== undefined
                    ? String(item.performanceRating)
                    : undefined,
                notes: item.notes || item.sessionNotes,
                trainer: userId,
              },
            });
          } else {
            updatedSession = await tx.trainingSession.create({
              data: {
                trainingAssignmentId: assignmentId,
                sessionDate: new Date(),
                sessionType: 'video',
                duration: 60,
                trainer: userId,
                completedAt: new Date(),
                performanceRating: item.performanceRating
                  ? String(item.performanceRating)
                  : undefined,
                notes: item.notes || item.sessionNotes,
              },
            });
          }

          // Complete training assignment and update project status to TRAINING_COMPLETED
          const assignment = await tx.trainingAssignment.findUnique({
            where: { id: assignmentId },
            select: { candidateProjectMapId: true, status: true, id: true },
          });

          if (assignment?.candidateProjectMapId && userId) {
            // Mark training assignment complete
            await tx.trainingAssignment.update({
              where: { id: assignmentId },
              data: {
                status: TRAINING_STATUS.COMPLETED,
                completedAt: new Date(),
              },
            });

            // Update candidate-project substatus to training_completed
            await tx.candidateProjects.update({
              where: { id: assignment.candidateProjectMapId },
              data: {
                subStatus: {
                  connect: { name: CANDIDATE_PROJECT_STATUS.TRAINING_COMPLETED },
                },
              },
            });

            const subStatus = await tx.candidateProjectSubStatus.findUnique({
              where: { name: CANDIDATE_PROJECT_STATUS.TRAINING_COMPLETED },
              include: { stage: true },
            });

            if (subStatus) {
              const user = await tx.user.findUnique({
                where: { id: userId },
                select: { name: true },
              });

              await tx.candidateProjectStatusHistory.create({
                data: {
                  candidateProjectMapId: assignment.candidateProjectMapId,
                  mainStatusId: subStatus.stageId,
                  subStatusId: subStatus.id,
                  mainStatusSnapshot: subStatus.stage.label,
                  subStatusSnapshot: subStatus.label,
                  changedById: userId,
                  changedByName: user?.name || 'System',
                  reason: 'Training session completed (Bulk)',
                  notes: `Training conducted and completed on ${new Date().toLocaleString()}`,
                },
              });

              await tx.interviewStatusHistory.create({
                data: {
                  interviewType: 'training',
                  interviewId: assignment.id,
                  candidateProjectMapId: assignment.candidateProjectMapId,
                  status: CANDIDATE_PROJECT_STATUS.TRAINING_COMPLETED,
                  statusSnapshot: 'Training Completed',
                  statusAt: new Date(),
                  changedById: userId,
                  changedByName: user?.name || 'System',
                  reason: `Training conducted and completed on ${new Date().toLocaleString()}`,
                },
              });
            }
          }

          return updatedSession;
        });

        results.push(session);
      } catch (error) {
        console.error(`Failed to complete session ${item.sessionId}:`, error);
      }
    }

    return results;
  }

  /**
   * Get all sessions for a training assignment
   */
  async findSessionsByAssignment(trainingAssignmentId: string) {
    return this.prisma.trainingSession.findMany({
      where: { trainingAssignmentId },
      orderBy: { sessionDate: 'desc' },
    });
  }

  /**
   * Get training (interviewType === 'training') history for a candidate-project
   */
  async getTrainingHistory(candidateProjectMapId: string, query: any) {
    // Verify candidate-project exists
    const cp = await this.prisma.candidateProjects.findUnique({ where: { id: candidateProjectMapId } });
    if (!cp) throw new NotFoundException(`Candidate-Project with ID "${candidateProjectMapId}" not found`);

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    // Include training events (interviewType='training') OR any events that have no interviewId (interviewId IS NULL)
    // This ensures records where interviewId is null are considered training-related history
    const where: any = {
      candidateProjectMapId,
      OR: [
        { interviewType: 'training' },
        { interviewId: null },
      ],
    };
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.interviewStatusHistory.findMany({ where, orderBy: { statusAt: 'desc' }, skip, take: limit }),
      this.prisma.interviewStatusHistory.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /**
   * Update a training session
   */
  async updateSession(
    id: string,
    updateData: Partial<CreateTrainingSessionDto>,
  ) {
    const session = await this.prisma.trainingSession.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException(`Training Session with ID "${id}" not found`);
    }

    return this.prisma.trainingSession.update({
      where: { id },
      data: {
        sessionDate: updateData.sessionDate
          ? new Date(updateData.sessionDate)
          : undefined,
        sessionType: updateData.sessionType,
        duration: updateData.duration,
        topicsCovered: updateData.topicsCovered,
        plannedActivities: updateData.plannedActivities,
        trainer: updateData.trainer,
      },
    });
  }

  /**
   * Complete a training session
   */
  async completeSession(id: string, dto: CompleteTrainingSessionDto) {
    const session = await this.prisma.trainingSession.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException(`Training Session with ID "${id}" not found`);
    }

    if (session.completedAt) {
      throw new BadRequestException('Session is already completed');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedSession = await tx.trainingSession.update({
        where: { id },
        data: {
          completedAt: new Date(),
          performanceRating: dto.performanceRating ? String(dto.performanceRating) : undefined,
          notes: dto.notes || dto.sessionNotes,
          feedback: dto.feedback,
          topicsCovered: dto.topicsCovered || undefined,
          ...(dto.internalComments ? { notes: `${dto.notes || dto.sessionNotes || ''}\nInternal: ${dto.internalComments}`.trim() } : {}),
        },
      });

      // Update assignment status to 'in_progress' and candidate-project substatus to 'training_in_progress'
      const assignment = await tx.trainingAssignment.findUnique({
        where: { id: session.trainingAssignmentId },
        select: { status: true, candidateProjectMapId: true },
      });

      if (assignment && (assignment.status === TRAINING_STATUS.ASSIGNED || assignment.status === TRAINING_STATUS.SCHEDULED)) {
        await tx.trainingAssignment.update({
          where: { id: session.trainingAssignmentId },
          data: {
            status: TRAINING_STATUS.IN_PROGRESS,
            startedAt: new Date(),
          },
        });

        // Update candidate project substatus
        await tx.candidateProjects.update({
          where: { id: assignment.candidateProjectMapId },
          data: {
            subStatus: {
              connect: {
                name: CANDIDATE_PROJECT_STATUS.TRAINING_IN_PROGRESS,
              },
            },
          },
        });

        // Record status history
        await tx.candidateProjectStatusHistory.create({
          data: {
            candidateProjectMapId: assignment.candidateProjectMapId,
            subStatusSnapshot: CANDIDATE_PROJECT_STATUS.TRAINING_IN_PROGRESS,
            reason: 'Training started (session completed)',
          },
        });
      }

      return updatedSession;
    });
  }

  /**
   * Delete a training session
   */
  async removeSession(id: string) {
    const session = await this.prisma.trainingSession.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException(`Training Session with ID "${id}" not found`);
    }

    await this.prisma.trainingSession.delete({
      where: { id },
    });

    return { success: true, message: 'Training session deleted successfully' };
  }

  /**
   * Send candidate for interview (delegate to CandidateProjectsService)
   * Mirrors candidate-projects sendForInterview API
   */
  async sendForInterview(dto: any, userId: string) {
    // Delegate to existing CandidateProjectsService implementation
    const candidateProject = await this.candidateProjectsService.sendForInterview(dto, userId);

    // Update any related training assignments to reflect interview assignment
    // Map candidate-project send type to training assignment status
    const trainingStatus = dto.type === 'screening_assigned'
      ? 'screening_assigned'
      : dto.type === 'training_assigned'
      ? 'basic_training_assigned'
      : 'interview_assigned';

    await this.prisma.trainingAssignment.updateMany({
      where: {
        candidateProjectMapId: (candidateProject as any).id,
        status: { notIn: ['completed', 'cancelled'] },
      },
      data: {
        status: trainingStatus,
      },
    });

    // Ensure interview-level history exists for this candidate-project and attach it to the returned object
    const historyCount = await this.prisma.interviewStatusHistory.count({ where: { candidateProjectMapId: (candidateProject as any).id } });
    if (historyCount === 0) {
      // Map dto.type to interviewType/statusSnapshot
      const historyType = dto.type === 'screening_assigned' ? 'screening' : dto.type === 'training_assigned' ? 'training' : 'client';
      const statusSnapshot = dto.type === 'screening_assigned' ? 'Screening Assigned' : dto.type === 'training_assigned' ? 'Basic Training Assigned' : 'Client Interview Assigned';

      await this.prisma.interviewStatusHistory.create({
        data: {
          interviewType: historyType,
          interviewId: null,
          candidateProjectMapId: (candidateProject as any).id,
          previousStatus: null,
          status: 'assigned',
          statusSnapshot,
          statusAt: new Date(),
          changedById: userId,
          changedByName: null,
          reason: `${statusSnapshot}`,
        },
      });
    }

    const history = await this.prisma.interviewStatusHistory.findMany({ where: { candidateProjectMapId: (candidateProject as any).id }, orderBy: { statusAt: 'desc' } });

    return { ...(candidateProject as any), history };
  }
}
