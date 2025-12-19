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

      return {
        ...assignment,
        candidateProjectMap: {
          ...assignment.candidateProjectMap,
          candidate,
        },
        assignedBy: assigner ?? assignment.assignedBy,
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
                  rolesNeeded: true,
                },
              },
            roleNeeded: { select: { designation: true } },
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
      ...(it as any),
      candidateProjectMap: {
        ...it.candidateProjectMap,
        candidate: it.candidateProjectMap?.candidate
          ? { ...it.candidateProjectMap.candidate, phone: `${it.candidateProjectMap.candidate.countryCode ?? ''} ${it.candidateProjectMap.candidate.mobileNumber ?? ''}`.trim() }
          : null,
      },
    }));
    // Batch fetch assigner users and attach their info to assignments
    const assignerIds = Array.from(new Set(items.map((it) => it.assignedBy).filter(Boolean)));
    let usersById: Record<string, any> = {};
    if (assignerIds.length > 0) {
      const users = await this.prisma.user.findMany({ where: { id: { in: assignerIds } }, select: { id: true, name: true, email: true } });
      usersById = users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {} as Record<string, any>);
    }
    return itemsWithCandidateContact.map((it) => ({ ...(it as any), assignedBy: usersById[it.assignedBy] ?? it.assignedBy }));
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

    if (assignment!.status !== TRAINING_STATUS.ASSIGNED) {
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
  async createSession(dto: CreateTrainingSessionDto) {
    // Verify training assignment exists
    const assignment = await this.findOneAssignment(dto.trainingAssignmentId);

    return this.prisma.trainingSession.create({
      data: {
        trainingAssignmentId: dto.trainingAssignmentId,
        sessionDate: new Date(dto.sessionDate),
        sessionType: dto.sessionType || 'video',
        duration: dto.duration || 60,
        topicsCovered: dto.topicsCovered || [],
        plannedActivities: dto.plannedActivities,
        trainer: dto.trainer,
      },
    });
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

    return this.prisma.trainingSession.update({
      where: { id },
      data: {
        completedAt: new Date(),
        performanceRating: dto.performanceRating,
        notes: dto.notes,
        feedback: dto.feedback,
      },
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
