import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ProcessingStepKey,
  ProcessingStepStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  PROCESSING_STEPS,
  PROCESSING_STEP_CONFIG_MAP,
  PROCESSING_STEP_ORDER,
} from './processing.constants';
import { QueryProcessingCandidatesDto } from './dto/query-processing-candidates.dto';
import { UpdateProcessingStepDto } from './dto/update-processing-step.dto';

const PROCESSING_VISIBLE_STATUSES = [
  'interview_passed',
  'selected',
  'processing',
];

@Injectable()
export class ProcessingService {
  private processingStatusId?: number;
  private hiredStatusId?: number;

  constructor(private readonly prisma: PrismaService) {}

  async listCandidates(query: QueryProcessingCandidatesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    query.page = page;
    query.limit = limit;
    const where = this.buildProcessingWhere(query);

    const ids = await this.prisma.candidateProjects.findMany({
      where,
      select: { id: true },
    });
    await this.ensureStructures(ids.map((item) => item.id));

    const skip = (page - 1) * limit;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.candidateProjects.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
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
            select: {
              id: true,
              title: true,
              countryCode: true,
              deadline: true,
            },
          },
          processingSteps: true,
        },
      }),
      this.prisma.candidateProjects.count({ where }),
    ]);

    const data = rows.map((row) => {
      const steps = this.sortSteps(row.processingSteps);
      const currentStep =
        steps.find((step) => !this.isStepComplete(step.status)) ??
        steps[steps.length - 1];
      const completedCount = steps.filter((step) =>
        this.isStepComplete(step.status),
      ).length;
      const progress = Math.round((completedCount / steps.length) * 100);

      return {
        candidateProjectMapId: row.id,
        candidate: row.candidate,
        project: row.project,
        steps,
        currentStep,
        progress,
      };
    });

    return {
      success: true,
      data: {
        items: data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.max(1, Math.ceil(total / limit)),
        },
      },
      message: 'Processing candidates retrieved successfully',
    };
  }

  async getDetail(candidateProjectMapId: string) {
    await this.ensureStructures([candidateProjectMapId]);

    const record = await this.prisma.candidateProjects.findUnique({
      where: { id: candidateProjectMapId },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            countryCode: true,
            mobileNumber: true,
            currentStatus: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
            client: {
              select: { id: true, name: true },
            },
            countryCode: true,
            deadline: true,
          },
        },
        processingSteps: true,
      },
    });

    if (!record) {
      throw new NotFoundException(
        `Candidate project mapping ${candidateProjectMapId} not found`,
      );
    }

    const steps = this.sortSteps(record.processingSteps);

    return {
      success: true,
      data: {
        candidate: record.candidate,
        project: record.project,
        steps,
      },
      message: 'Processing detail retrieved successfully',
    };
  }

  async getHistory(candidateProjectMapId: string) {
    const history = await this.prisma.processingStepHistory.findMany({
      where: { candidateProjectMapId },
      orderBy: { changedAt: 'desc' },
    });

    return {
      success: true,
      data: history,
      message: 'Processing history fetched successfully',
    };
  }

  async updateStep(
    candidateProjectMapId: string,
    stepKey: ProcessingStepKey,
    dto: UpdateProcessingStepDto,
    actor: { id: string; name?: string },
  ) {
    await this.ensureStructures([candidateProjectMapId]);
    const config = PROCESSING_STEP_CONFIG_MAP[stepKey];
    if (!config) {
      throw new BadRequestException('Invalid processing step');
    }

    const step = await this.prisma.processingStep.findUnique({
      where: {
        candidateProjectMapId_stepKey: { candidateProjectMapId, stepKey },
      },
    });

    if (!step) {
      throw new NotFoundException('Processing step not found');
    }

    const data: Prisma.ProcessingStepUpdateInput = {
      status: dto.status,
      notes: dto.notes ?? null,
      updatedAt: new Date(),
      slaDays: step.slaDays || config.defaultSlaDays,
      lastUpdatedBy: actor.id
        ? {
            connect: { id: actor.id },
          }
        : undefined,
    };

    if (dto.status === ProcessingStepStatus.IN_PROGRESS && !step.startedAt) {
      data.startedAt = new Date();
      data.dueDate = step.dueDate ?? this.computeDueDate(config.defaultSlaDays);
    }

    if (dto.status === ProcessingStepStatus.DONE) {
      data.completedAt = new Date();
      data.startedAt = step.startedAt ?? new Date();
      data.dueDate = step.dueDate ?? this.computeDueDate(config.defaultSlaDays);
    }

    const isNotApplicable =
      (dto.status as unknown as string) === 'NOT_APPLICABLE';

    if (isNotApplicable) {
      data.notApplicableReason =
        dto.notApplicableReason ?? 'Marked as not applicable';
      data.completedAt = new Date();
    } else if (dto.notApplicableReason) {
      data.notApplicableReason = dto.notApplicableReason;
    } else {
      data.notApplicableReason = null;
    }

    const updated = await this.prisma.processingStep.update({
      where: {
        candidateProjectMapId_stepKey: { candidateProjectMapId, stepKey },
      },
      data,
    });

    await this.prisma.processingStepHistory.create({
      data: {
        candidateProjectMapId,
        stepKey,
        previousStatus: step.status,
        newStatus: dto.status,
        notes: dto.notes,
        actorId: actor.id,
        actorName: actor.name,
      },
    });

    if (this.isStepComplete(dto.status)) {
      await this.tryActivateNextStep(candidateProjectMapId, stepKey);
      await this.maybeMarkProcessingComplete(candidateProjectMapId);
    }

    return {
      success: true,
      data: updated,
      message: 'Processing step updated successfully',
    };
  }

  private buildProcessingWhere(query: QueryProcessingCandidatesDto) {
    const where: Prisma.CandidateProjectsWhereInput = {
      currentProjectStatus: {
        statusName: { in: PROCESSING_VISIBLE_STATUSES },
      },
    };

    if (query.projectId) {
      where.projectId = query.projectId;
    }

    if (query.search) {
      where.candidate = {
        OR: [
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { mobileNumber: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    if (query.status) {
      where.processingSteps = {
        some: {
          status: query.status,
        },
      };
    }

    return where;
  }

  private async ensureStructures(candidateProjectMapIds: string[]) {
    const uniqueIds = [...new Set(candidateProjectMapIds)];
    await Promise.all(
      uniqueIds.map((id) => this.ensureProcessingStructure(id)),
    );
  }

  private async ensureProcessingStructure(candidateProjectMapId: string) {
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id: candidateProjectMapId },
      select: { id: true, currentProjectStatusId: true },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        `Candidate project map ${candidateProjectMapId} not found`,
      );
    }

    await this.prisma.processing.upsert({
      where: { candidateProjectMapId },
      update: {},
      create: { candidateProjectMapId },
    });

    const existingSteps = await this.prisma.processingStep.findMany({
      where: { candidateProjectMapId },
    });
    const existingKeys = new Set(existingSteps.map((step) => step.stepKey));

    const now = new Date();

    for (const [index, stepConfig] of PROCESSING_STEPS.entries()) {
      if (existingKeys.has(stepConfig.key)) continue;
      const isFirst = index === 0;
      await this.prisma.processingStep.create({
        data: {
          candidateProjectMapId,
          stepKey: stepConfig.key,
          status: isFirst
            ? ProcessingStepStatus.IN_PROGRESS
            : ProcessingStepStatus.PENDING,
          slaDays: stepConfig.defaultSlaDays,
          dueDate: isFirst
            ? this.computeDueDate(stepConfig.defaultSlaDays)
            : null,
          startedAt: isFirst ? now : null,
        },
      });
    }

    const processingStatusId = await this.getProcessingStatusId();
    if (candidateProject.currentProjectStatusId !== processingStatusId) {
      await this.prisma.candidateProjects.update({
        where: { id: candidateProjectMapId },
        data: { currentProjectStatusId: processingStatusId },
      });
    }
  }

  private computeDueDate(days: number) {
    const due = new Date();
    due.setDate(due.getDate() + days);
    return due;
  }

  private sortSteps<T extends { stepKey: ProcessingStepKey }>(steps: T[]): T[] {
    return [...steps].sort((a, b) => {
      const aIndex = PROCESSING_STEP_ORDER.indexOf(a.stepKey);
      const bIndex = PROCESSING_STEP_ORDER.indexOf(b.stepKey);
      return aIndex - bIndex;
    });
  }

  private isStepComplete(status: ProcessingStepStatus) {
    return (
      status === ProcessingStepStatus.DONE ||
      status === ProcessingStepStatus.NOT_APPLICABLE
    );
  }

  private async tryActivateNextStep(
    candidateProjectMapId: string,
    completedStepKey: ProcessingStepKey,
  ) {
    const currentIndex = PROCESSING_STEP_ORDER.indexOf(completedStepKey);
    const nextKey = PROCESSING_STEP_ORDER[currentIndex + 1];
    if (!nextKey) return;

    const nextStep = await this.prisma.processingStep.findUnique({
      where: {
        candidateProjectMapId_stepKey: {
          candidateProjectMapId,
          stepKey: nextKey,
        },
      },
    });

    if (!nextStep || nextStep.status !== ProcessingStepStatus.PENDING) {
      return;
    }

    const config = PROCESSING_STEP_CONFIG_MAP[nextKey];
    await this.prisma.processingStep.update({
      where: {
        candidateProjectMapId_stepKey: {
          candidateProjectMapId,
          stepKey: nextKey,
        },
      },
      data: {
        status: ProcessingStepStatus.IN_PROGRESS,
        startedAt: new Date(),
        dueDate: this.computeDueDate(config.defaultSlaDays),
      },
    });
  }

  private async maybeMarkProcessingComplete(candidateProjectMapId: string) {
    const steps = await this.prisma.processingStep.findMany({
      where: { candidateProjectMapId },
    });
    const hasPending = steps.some((step) => !this.isStepComplete(step.status));
    if (!hasPending) {
      const hiredStatusId = await this.getHiredStatusId();
      await this.prisma.candidateProjects.update({
        where: { id: candidateProjectMapId },
        data: { currentProjectStatusId: hiredStatusId },
      });
    }
  }

  private async getProcessingStatusId() {
    if (this.processingStatusId) return this.processingStatusId;
    const status = await this.prisma.candidateProjectStatus.findFirst({
      where: { statusName: 'processing' },
      select: { id: true },
    });
    if (!status) {
      throw new NotFoundException('Processing status missing in catalog');
    }
    this.processingStatusId = status.id;
    return status.id;
  }

  private async getHiredStatusId() {
    if (this.hiredStatusId) return this.hiredStatusId;
    const status = await this.prisma.candidateProjectStatus.findFirst({
      where: { statusName: 'hired' },
      select: { id: true },
    });
    if (!status) {
      throw new NotFoundException('Hired status missing in catalog');
    }
    this.hiredStatusId = status.id;
    return status.id;
  }
}
