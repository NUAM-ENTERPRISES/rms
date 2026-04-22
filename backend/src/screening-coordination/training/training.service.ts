import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
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

  private buildCandidateContact(candidate: any) {
    if (!candidate) return null;
    return {
      ...candidate,
      phone: `${candidate.countryCode ?? ''} ${candidate.mobileNumber ?? ''}`.trim(),
    };
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }
    return user;
  }

  private async resolveNextAttemptNumber(screeningId: string) {
    const latest = await this.prisma.screeningTraining.findFirst({
      where: { screeningId },
      orderBy: { attemptNumber: 'desc' },
      select: { attemptNumber: true, status: true },
    });

    if (!latest) return 1;

    if (
      [
        TRAINING_STATUS.ASSIGNED,
        TRAINING_STATUS.SCHEDULED,
        TRAINING_STATUS.IN_PROGRESS,
        TRAINING_STATUS.RETRAINING,
      ].includes(latest.status as any)
    ) {
      throw new ConflictException(
        `There is already an active training attempt for screening "${screeningId}".`,
      );
    }

    return latest.attemptNumber + 1;
  }

  async createAssignment(dto: CreateTrainingAssignmentDto) {
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

    const assignedByUser = await this.ensureUserExists(dto.assignedBy);

    let screeningId: string | undefined;
    if (dto.screeningId) {
      screeningId = dto.screeningId;
      const screening = await this.prisma.screening.findUnique({
        where: { id: screeningId },
      });
      if (!screening) {
        throw new NotFoundException(
          `Screening with ID "${screeningId}" not found`,
        );
      }
    }

    const attemptNumber = screeningId
      ? await this.resolveNextAttemptNumber(screeningId)
      : 1;

    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.screeningTraining.create({
        data: {
          candidateProjectMapId: dto.candidateProjectMapId,
          screeningId: screeningId ?? null,
          assignedBy: dto.assignedBy,
          trainerId: dto.trainerId ?? dto.assignedBy,
          focusAreas: dto.focusAreas,
          priority: dto.priority ?? 'medium',
          targetCompletionDate: dto.targetCompletionDate
            ? new Date(dto.targetCompletionDate)
            : null,
          notes: dto.notes ?? null,
          attemptNumber,
        },
        include: {
          candidateProjectMap: {
            include: {
              candidate: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  countryCode: true,
                  mobileNumber: true,
                },
              },
              project: { select: { title: true } },
            },
          },
        },
      });

      if (screeningId) {
        await tx.screening.update({
          where: { id: screeningId },
          data: { isAssignedTrainer: true } as any,
        });
      }

      await tx.candidateProjects.update({
        where: { id: dto.candidateProjectMapId },
        data: {
          subStatus: {
            connect: { name: CANDIDATE_PROJECT_STATUS.TRAINING_ASSIGNED },
          },
        },
      });

      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId: dto.candidateProjectMapId,
          subStatusSnapshot: CANDIDATE_PROJECT_STATUS.TRAINING_ASSIGNED,
          changedById: dto.assignedBy,
          reason: 'Training assigned after screening',
        },
      });

      await tx.interviewStatusHistory.create({
        data: {
          interviewType: 'screening',
          interviewId: screeningId ?? null,
          candidateProjectMapId: dto.candidateProjectMapId,
          previousStatus: null,
          status: CANDIDATE_PROJECT_STATUS.TRAINING_ASSIGNED,
          statusSnapshot: 'Training Assigned',
          statusAt: new Date(),
          changedById: dto.assignedBy,
          changedByName: assignedByUser.name ?? null,
          reason: 'Training assigned after screening',
        },
      });

      return {
        ...assignment,
        assignedBy: assignedByUser,
        candidateProjectMap: {
          ...assignment.candidateProjectMap,
          candidate: this.buildCandidateContact(
            assignment.candidateProjectMap?.candidate,
          ),
        },
      };
    });
  }

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

    where.NOT = { screeningId: null };

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, query.limit ?? 10);
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.prisma.screeningTraining.count({ where }),
      this.prisma.screeningTraining.findMany({
        where,
        skip,
        take: limit,
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
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  countryCode: true,
                  mobileNumber: true,
                },
              },
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
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const itemsWithCandidateContact = items.map((it) => ({
      ...it,
      candidateProjectMap: {
        ...it.candidateProjectMap,
        candidate: this.buildCandidateContact(it.candidateProjectMap?.candidate),
      },
    }));

    const userIds = Array.from(
      new Set([
        ...(itemsWithCandidateContact.map((it) => it.assignedBy).filter((id): id is string => Boolean(id))),
        ...(itemsWithCandidateContact.map((it) => it.trainerId).filter((id): id is string => Boolean(id))),
      ]),
    );

    let usersById: Record<string, any> = {};
    if (userIds.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      });
      usersById = users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {} as Record<string, any>);
    }

    const grouping: Record<string, any[]> = {};
    itemsWithCandidateContact.forEach((it: any) => {
      const cpm = it.candidateProjectMap?.id;
      if (!cpm) return;
      if (!grouping[cpm]) grouping[cpm] = [];
      grouping[cpm].push(it);
    });
    Object.values(grouping).forEach((list) => {
      list.sort(
        (a, b) => new Date(a.assignedAt).getTime() - new Date(b.assignedAt).getTime(),
      );
      list.forEach((item: any, index: number) => {
        item.trainingAttempt = index + 1;
        item.trainingAttemptTotal = list.length;
      });
    });

    const paginatedItems = itemsWithCandidateContact.map((it: any) => ({
      ...it,
      assignedBy: usersById[it.assignedBy] ?? it.assignedBy,
      trainer: it.trainerId ? usersById[it.trainerId] ?? { id: it.trainerId } : null,
    }));

    return {
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllBasicTrainings(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      screeningId: null,
    };

    if (query.assignedBy) {
      where.assignedBy = query.assignedBy;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      const s = query.search;
      where.OR = [
        { candidateProjectMap: { candidate: { firstName: { contains: s, mode: 'insensitive' } } } },
        { candidateProjectMap: { candidate: { lastName: { contains: s, mode: 'insensitive' } } } },
        { candidateProjectMap: { project: { title: { contains: s, mode: 'insensitive' } } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.screeningTraining.findMany({
        where,
        include: {
          candidateProjectMap: {
            include: {
              candidate: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  countryCode: true,
                  mobileNumber: true,
                },
              },
              project: {
                include: {
                  client: true,
                  country: true,
                  creator: { select: { id: true, name: true, email: true } },
                  team: true,
                },
              },
              roleNeeded: { select: { designation: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.screeningTraining.count({ where }),
    ]);

    return {
      items: items.map((it) => ({
        ...it,
        candidateProjectMap: {
          ...it.candidateProjectMap,
          candidate: this.buildCandidateContact(it.candidateProjectMap?.candidate),
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneAssignment(id: string) {
    const assignment = await this.prisma.screeningTraining.findUnique({
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
                countryCode: true,
                mobileNumber: true,
              },
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
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Training assignment with ID "${id}" not found`);
    }

    const assignedByUser = assignment.assignedBy
      ? await this.prisma.user.findUnique({
          where: { id: assignment.assignedBy },
          select: { id: true, name: true, email: true },
        })
      : null;

    return {
      ...assignment,
      assignedBy: assignedByUser ?? assignment.assignedBy,
      candidateProjectMap: {
        ...assignment.candidateProjectMap,
        candidate: this.buildCandidateContact(assignment.candidateProjectMap?.candidate),
      },
    };
  }

  async updateAssignment(id: string, dto: UpdateTrainingAssignmentDto) {
    await this.findOneAssignment(id);

    return this.prisma.screeningTraining.update({
      where: { id },
      data: {
        focusAreas: dto.focusAreas,
        priority: dto.priority,
        targetCompletionDate: dto.targetCompletionDate
          ? new Date(dto.targetCompletionDate)
          : undefined,
        notes: dto.notes,
        assignedBy: dto.assignedBy,
        trainerId: dto.trainerId,
      },
      include: {
        candidateProjectMap: {
          include: {
            candidate: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                countryCode: true,
                mobileNumber: true,
              },
            },
            project: { select: { title: true } },
          },
        },
      },
    });
  }

  async startTraining(id: string, userId: string) {
    const assignment = await this.findOneAssignment(id);
    if (
      assignment.status !== TRAINING_STATUS.ASSIGNED &&
      assignment.status !== TRAINING_STATUS.SCHEDULED
    ) {
      throw new BadRequestException(
        `Training cannot be started. Current status: ${assignment.status}`,
      );
    }

    await this.ensureUserExists(userId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.screeningTraining.update({
        where: { id },
        data: {
          status: TRAINING_STATUS.IN_PROGRESS,
          startedAt: new Date(),
        },
      });

      await tx.candidateProjects.update({
        where: { id: assignment.candidateProjectMapId },
        data: {
          subStatus: {
            connect: { name: CANDIDATE_PROJECT_STATUS.TRAINING_IN_PROGRESS },
          },
        },
      });

      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId: assignment.candidateProjectMapId,
          subStatusSnapshot: CANDIDATE_PROJECT_STATUS.TRAINING_IN_PROGRESS,
          changedById: userId,
          reason: 'Training started',
        },
      });

      await tx.interviewStatusHistory.create({
        data: {
          interviewType: 'screening',
          interviewId: assignment.screeningId ?? null,
          candidateProjectMapId: assignment.candidateProjectMapId,
          previousStatus: CANDIDATE_PROJECT_STATUS.TRAINING_ASSIGNED,
          status: CANDIDATE_PROJECT_STATUS.TRAINING_IN_PROGRESS,
          statusSnapshot: 'Training In Progress',
          statusAt: new Date(),
          changedById: userId,
          changedByName: null,
          reason: 'Training started',
        },
      });

      return updated;
    });
  }

  async completeTraining(
    id: string,
    dto: CompleteTrainingDto,
    userId: string,
  ) {
    const assignment = await this.findOneAssignment(id);
    if (assignment.status === TRAINING_STATUS.COMPLETED) {
      throw new BadRequestException('Training is already completed');
    }

    await this.ensureUserExists(userId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.screeningTraining.update({
        where: { id },
        data: {
          status: TRAINING_STATUS.COMPLETED,
          completedAt: new Date(),
          notes: dto.notes ?? assignment.notes,
          improvementNotes: dto.improvementNotes,
          focusAreas: dto.improvementNotes ? [dto.improvementNotes] : (assignment.focusAreas || []),
        },
      });

      await tx.candidateProjects.update({
        where: { id: assignment.candidateProjectMapId },
        data: {
          subStatus: {
            connect: { name: CANDIDATE_PROJECT_STATUS.TRAINING_COMPLETED },
          },
        },
      });

      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId: assignment.candidateProjectMapId,
          subStatusSnapshot: CANDIDATE_PROJECT_STATUS.TRAINING_COMPLETED,
          changedById: userId,
          reason: 'Training completed',
          notes: dto.improvementNotes,
        },
      });

      await tx.interviewStatusHistory.create({
        data: {
          interviewType: 'screening',
          interviewId: assignment.screeningId ?? null,
          candidateProjectMapId: assignment.candidateProjectMapId,
          previousStatus: CANDIDATE_PROJECT_STATUS.TRAINING_IN_PROGRESS,
          status: CANDIDATE_PROJECT_STATUS.TRAINING_COMPLETED,
          statusSnapshot: 'Training Completed',
          statusAt: new Date(),
          changedById: userId,
          changedByName: null,
          reason: 'Training completed',
        },
      });

      return updated;
    });
  }

  async markReadyForReassessment(id: string, userId: string) {
    const assignment = await this.findOneAssignment(id);
    if (assignment.status !== TRAINING_STATUS.COMPLETED) {
      throw new BadRequestException(
        'Training must be completed before marking ready for reassessment',
      );
    }

    await this.ensureUserExists(userId);

    return this.prisma.$transaction(async (tx) => {
      await tx.candidateProjects.update({
        where: { id: assignment.candidateProjectMapId },
        data: {
          subStatus: {
            connect: { name: CANDIDATE_PROJECT_STATUS.READY_FOR_REASSESSMENT },
          },
        },
      });

      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId: assignment.candidateProjectMapId,
          subStatusSnapshot: CANDIDATE_PROJECT_STATUS.READY_FOR_REASSESSMENT,
          changedById: userId,
          reason: 'Candidate ready for screening reassessment',
        },
      });

      await tx.interviewStatusHistory.create({
        data: {
          interviewType: 'screening',
          interviewId: assignment.screeningId ?? null,
          candidateProjectMapId: assignment.candidateProjectMapId,
          previousStatus: CANDIDATE_PROJECT_STATUS.TRAINING_COMPLETED,
          status: CANDIDATE_PROJECT_STATUS.READY_FOR_REASSESSMENT,
          statusSnapshot: 'Ready for Reassessment',
          statusAt: new Date(),
          changedById: userId,
          changedByName: null,
          reason: 'Candidate ready for screening reassessment',
        },
      });

      return {
        success: true,
        message: 'Candidate marked ready for reassessment',
      };
    });
  }

  async removeAssignment(id: string) {
    await this.findOneAssignment(id);

    await this.prisma.screeningTraining.delete({ where: { id } });
    return { success: true, message: 'Training assignment deleted successfully' };
  }

  async createSession(dto: CreateTrainingSessionDto, userId?: string) {
    const assignment = await this.findOneAssignment(dto.trainingAssignmentId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.screeningTraining.update({
        where: { id: dto.trainingAssignmentId },
        data: {
          scheduledTime: new Date(dto.sessionDate),
          duration: dto.duration ?? 60,
          meetingLink: dto.meetingLink,
          sessionType: dto.sessionType ?? 'video',
          trainerId: dto.trainer ?? assignment.trainerId,
          status: TRAINING_STATUS.SCHEDULED,
        },
      });

      if (assignment.candidateProjectMapId && userId) {
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

        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });

        if (subStatus) {
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
              notes: `Training session scheduled for ${new Date(dto.sessionDate).toLocaleString()}`,
            },
          });

          await tx.interviewStatusHistory.create({
            data: {
              interviewType: 'training',
              interviewId: updated.id,
              candidateProjectMapId: assignment.candidateProjectMapId,
              status: CANDIDATE_PROJECT_STATUS.TRAINING_SCHEDULED,
              statusSnapshot: 'Training Scheduled',
              statusAt: new Date(),
              changedById: userId,
              changedByName: user?.name || 'System',
              reason: `Training session scheduled for ${new Date(dto.sessionDate).toLocaleString()}`,
            },
          });
        }
      }

      return updated;
    });
  }

  async bulkCreateSessions(dto: BulkCreateSessionsDto, userId: string) {
    const results: any[] = [];

    for (const assignmentId of dto.trainingAssignmentIds) {
      try {
        const session = await this.createSession(
          {
            trainingAssignmentId: assignmentId,
            sessionDate: dto.sessionDate,
            duration: dto.duration,
            sessionType: dto.mode as any,
            trainer: userId,
            topicsCovered: dto.topic ? [dto.topic] : undefined,
            meetingLink: dto.meetingLink,
          } as any,
          userId,
        );
        results.push(session);
      } catch (error) {
        console.error(`Failed to schedule training for ${assignmentId}:`, error);
      }
    }

    return results;
  }

  async bulkCompleteSessions(dto: BulkCompleteSessionsDto, userId: string) {
    const results: any[] = [];

    for (const item of dto.sessions) {
      const assignmentId = item.sessionId.startsWith('new-')
        ? item.sessionId.replace('new-', '')
        : item.sessionId;

      try {
        const assignment = await this.findOneAssignment(assignmentId);
        const updated = await this.prisma.$transaction(async (tx) => {
          const completed = await tx.screeningTraining.update({
            where: { id: assignmentId },
            data: {
              status: TRAINING_STATUS.COMPLETED,
              completedAt: new Date(),
              notes: item.notes || item.sessionNotes || assignment.notes,
              focusAreas: item.feedback ? (Array.isArray(item.feedback) ? item.feedback : [item.feedback]) : (assignment.focusAreas || []),
            },
          });

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

          const user = await tx.user.findUnique({
            where: { id: userId },
            select: { name: true },
          });

          if (subStatus) {
            await tx.candidateProjectStatusHistory.create({
              data: {
                candidateProjectMapId: assignment.candidateProjectMapId,
                mainStatusId: subStatus.stageId,
                subStatusId: subStatus.id,
                mainStatusSnapshot: subStatus.stage.label,
                subStatusSnapshot: subStatus.label,
                changedById: userId,
                changedByName: user?.name || 'System',
                reason: 'Training session completed (bulk)',
                notes: `Training completed on ${new Date().toLocaleString()}`,
              },
            });

            await tx.interviewStatusHistory.create({
              data: {
                interviewType: 'training',
                interviewId: assignmentId,
                candidateProjectMapId: assignment.candidateProjectMapId,
                status: CANDIDATE_PROJECT_STATUS.TRAINING_COMPLETED,
                statusSnapshot: 'Training Completed',
                statusAt: new Date(),
                changedById: userId,
                changedByName: user?.name || 'System',
                reason: `Training completed on ${new Date().toLocaleString()}`,
              },
            });
          }

          return completed;
        });

        results.push(updated);
      } catch (error) {
        console.error(`Failed to complete training for ${assignmentId}:`, error);
      }
    }

    return results;
  }

  async findSessionsByAssignment(trainingAssignmentId: string) {
    const assignment = await this.findOneAssignment(trainingAssignmentId);
    return [assignment];
  }

  async getTrainingHistory(candidateProjectMapId: string, query: any) {
    const cp = await this.prisma.candidateProjects.findUnique({
      where: { id: candidateProjectMapId },
    });
    if (!cp) {
      throw new NotFoundException(
        `Candidate-Project with ID "${candidateProjectMapId}" not found`,
      );
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      candidateProjectMapId,
      OR: [{ interviewType: 'training' }, { interviewId: null }],
    };
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.interviewStatusHistory.findMany({
        where,
        orderBy: { statusAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.interviewStatusHistory.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async updateSession(
    id: string,
    updateData: Partial<CreateTrainingSessionDto>,
  ) {
    await this.findOneAssignment(id);

    return this.prisma.screeningTraining.update({
      where: { id },
      data: {
        scheduledTime: updateData.sessionDate
          ? new Date(updateData.sessionDate)
          : undefined,
        sessionType: updateData.sessionType,
        duration: updateData.duration,
        meetingLink: updateData.meetingLink,
        trainerId: updateData.trainer,
      },
    });
  }

  async completeSession(id: string, dto: CompleteTrainingSessionDto) {
    const assignment = await this.findOneAssignment(id);

    if (assignment.completedAt) {
      throw new BadRequestException('Training session is already completed');
    }

    const notes = [assignment.notes, dto.notes, dto.sessionNotes]
      .filter(Boolean)
      .join('\n')
      .trim();

    return this.prisma.screeningTraining.update({
      where: { id },
      data: {
        status: TRAINING_STATUS.COMPLETED,
        completedAt: new Date(),
        notes: notes || undefined,
      },
    });
  }

  async removeSession(id: string) {
    const assignment = await this.findOneAssignment(id);

    const desiredStatus =
      assignment.status === TRAINING_STATUS.SCHEDULED
        ? TRAINING_STATUS.ASSIGNED
        : assignment.status;

    return this.prisma.screeningTraining.update({
      where: { id },
      data: {
        scheduledTime: null,
        duration: null,
        meetingLink: null,
        sessionType: null,
        status: desiredStatus,
      },
    });
  }

  async sendForInterview(dto: any, userId: string) {
    const candidateProject = await this.candidateProjectsService.sendForInterview(
      dto,
      userId,
    );

    await this.prisma.screeningTraining.updateMany({
      where: {
        candidateProjectMapId: (candidateProject as any).id,
        status: { notIn: [TRAINING_STATUS.COMPLETED, TRAINING_STATUS.CANCELLED] },
      },
      data: {
        status: TRAINING_STATUS.ASSIGNED,
      },
    });

    const historyCount = await this.prisma.interviewStatusHistory.count({
      where: { candidateProjectMapId: (candidateProject as any).id },
    });

    if (historyCount === 0) {
      const historyType = dto.type === 'screening_assigned' ? 'screening' : dto.type === 'training_assigned' ? 'training' : 'client';
      const statusSnapshot =
        dto.type === 'screening_assigned'
          ? 'Screening Assigned'
          : dto.type === 'training_assigned'
          ? 'Basic Training Assigned'
          : 'Client Interview Assigned';

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

    const history = await this.prisma.interviewStatusHistory.findMany({
      where: { candidateProjectMapId: (candidateProject as any).id },
      orderBy: { statusAt: 'desc' },
    });

    return { ...(candidateProject as any), history };
  }
}
