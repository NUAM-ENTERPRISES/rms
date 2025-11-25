import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

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

    // If mock interview ID provided, verify it exists
    if (dto.mockInterviewId) {
      const mockInterview = await this.prisma.mockInterview.findUnique({
        where: { id: dto.mockInterviewId },
      });

      if (!mockInterview) {
        throw new NotFoundException(
          `Mock Interview with ID "${dto.mockInterviewId}" not found`,
        );
      }
    }

    // Create training assignment in transaction
    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.trainingAssignment.create({
        data: {
          candidateProjectMapId: dto.candidateProjectMapId,
          mockInterviewId: dto.mockInterviewId,
          assignedBy: dto.assignedBy,
          trainingType: dto.trainingType,
          focusAreas: dto.focusAreas,
          priority: dto.priority ?? 'medium',
          targetCompletionDate: dto.targetCompletionDate
            ? new Date(dto.targetCompletionDate)
            : null,
          notes: dto.notes,
        },
        include: {
          candidateProjectMap: {
            include: {
              candidate: {
                select: { firstName: true, lastName: true },
              },
              project: { select: { title: true } },
            },
          },
        },
      });

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
          reason: 'Training assigned after mock interview',
          notes: dto.notes,
        },
      });

      return assignment;
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

    return this.prisma.trainingAssignment.findMany({
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
        trainingSessions: {
          orderBy: { sessionDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
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
        mockInterview: {
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
      throw new NotFoundException(
        `Training Assignment with ID "${id}" not found`,
      );
    }

    return assignment;
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
              select: { firstName: true, lastName: true },
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

    if (assignment.status !== TRAINING_STATUS.ASSIGNED) {
      throw new BadRequestException(
        `Training cannot be started. Current status: ${assignment.status}`,
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
        where: { id: assignment.candidateProjectMapId },
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
          candidateProjectMapId: assignment.candidateProjectMapId,
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

    if (assignment.status === TRAINING_STATUS.COMPLETED) {
      throw new BadRequestException('Training is already completed');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.trainingAssignment.update({
        where: { id },
        data: {
          status: TRAINING_STATUS.COMPLETED,
          completedAt: new Date(),
          notes: dto.notes ?? assignment.notes,
          improvementNotes: dto.improvementNotes,
        },
      });

      // Update candidate-project status to training_completed
      await tx.candidateProjects.update({
        where: { id: assignment.candidateProjectMapId },
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
          candidateProjectMapId: assignment.candidateProjectMapId,
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

    if (assignment.status !== TRAINING_STATUS.COMPLETED) {
      throw new BadRequestException(
        'Training must be completed before marking ready for reassessment',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Update candidate-project status
      await tx.candidateProjects.update({
        where: { id: assignment.candidateProjectMapId },
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
          candidateProjectMapId: assignment.candidateProjectMapId,
          subStatusSnapshot: CANDIDATE_PROJECT_STATUS.READY_FOR_REASSESSMENT,
          changedById: userId,
          reason: 'Candidate ready for mock interview reassessment',
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
}
