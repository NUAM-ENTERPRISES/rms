import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CANDIDATE_PROJECT_STATUS } from '../common/constants/statuses';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { QueryInterviewsDto } from './dto/query-interviews.dto';

@Injectable()
export class InterviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createInterviewDto: CreateInterviewDto, scheduledBy: string) {
    let candidateProjectMap: any = null;
    let project: any = null;

    // Handle candidate-project combination or project-only interviews
    if (createInterviewDto.candidateProjectMapId) {
      candidateProjectMap = await this.prisma.candidateProjects.findUnique({
        where: {
          id: createInterviewDto.candidateProjectMapId,
        },
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          project: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      if (!candidateProjectMap) {
        throw new BadRequestException(
          'Candidate-project combination not found',
        );
      }
    } else if (createInterviewDto.projectId) {
      project = await this.prisma.project.findUnique({
        where: {
          id: createInterviewDto.projectId,
        },
        select: {
          id: true,
          title: true,
        },
      });

      if (!project) {
        throw new BadRequestException('Project not found');
      }
    } else {
      throw new BadRequestException(
        'Either candidateProjectMapId or projectId must be provided',
      );
    }

    // Check if interview already exists for this time slot
    const existingInterview = await this.prisma.interview.findFirst({
      where: {
        OR: [
          { candidateProjectMapId: createInterviewDto.candidateProjectMapId },
          { projectId: createInterviewDto.projectId },
        ],
        scheduledTime: {
          gte: new Date(createInterviewDto.scheduledTime),
          lt: new Date(
            new Date(createInterviewDto.scheduledTime).getTime() +
              (createInterviewDto.duration || 60) * 60000,
          ),
        },
      },
    });

    if (existingInterview) {
      throw new BadRequestException(
        'Interview already scheduled for this time slot',
      );
    }

    // Resolve scheduler name for human-friendly history entries (if provided)
    let schedulerName: string | null = null;
    if (scheduledBy) {
      const scheduler = await this.prisma.user.findUnique({ where: { id: scheduledBy } });
      schedulerName = scheduler?.name ?? null;
    }

    // If this interview is tied to a candidateProjectMap we should update
    // the candidate's subStatus and also write history records. Do these
    // operations in a transaction so data stays consistent.
    const interview = await this.prisma.$transaction(async (tx) => {
      const created = await tx.interview.create({
        data: {
          ...createInterviewDto,
          interviewer: scheduledBy,
        },
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
            project: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        },
      });

      // If candidateProjectMapId present - update candidate project status + history
      if (createInterviewDto.candidateProjectMapId) {
        await tx.candidateProjects.update({
          where: { id: createInterviewDto.candidateProjectMapId },
          data: {
            subStatus: { connect: { name: CANDIDATE_PROJECT_STATUS.INTERVIEW_SCHEDULED } },
          },
        });

        await tx.candidateProjectStatusHistory.create({
          data: {
            candidateProjectMapId: createInterviewDto.candidateProjectMapId,
            subStatusSnapshot: CANDIDATE_PROJECT_STATUS.INTERVIEW_SCHEDULED,
            changedById: scheduledBy ?? null,
            changedByName: schedulerName ?? null,
            reason: `Interview scheduled${schedulerName ? ` by ${schedulerName}` : scheduledBy ? ` by ${scheduledBy}` : ''}`,
          },
        });

        // record interview history event
        await tx.interviewStatusHistory.create({
          data: {
            interviewId: created.id,
            interviewType: 'client',
            status: 'scheduled',
            statusSnapshot: 'scheduled',
            changedById: scheduledBy ?? null,
            changedByName: schedulerName ?? null,
            reason: `Client interview scheduled${schedulerName ? ` by ${schedulerName}` : scheduledBy ? ` by ${scheduledBy}` : ''}`,
          },
        });
      }

      return created;
    });

    return interview;
  }

  async findAll(query: QueryInterviewsDto) {
    const {
      search,
      type,
      mode,
      status,
      projectId,
      candidateId,
      page = 1,
      limit = 10,
    } = query;

    const where: any = {};

    // Apply filters
    if (type) {
      where.type = type;
    }

    if (mode) {
      where.mode = mode;
    }

    if (status) {
      where.outcome = status;
    }

    if (projectId) {
      where.candidateProjectMap = {
        projectId: projectId,
      };
    }

    if (candidateId) {
      where.candidateProjectMap = {
        candidateId: candidateId,
      };
    }

    // Search functionality
    if (search) {
      where.OR = [
        {
          candidateProjectMap: {
            candidate: {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          candidateProjectMap: {
            project: {
              title: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
      ];
    }

    const skip = (page - 1) * limit;

    const [interviews, total] = await Promise.all([
      this.prisma.interview.findMany({
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
                },
              },
              project: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
          project: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          scheduledTime: 'asc',
        },
        skip,
        take: limit,
      }),
      this.prisma.interview.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      interviews,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findOne(id: string) {
    const interview = await this.prisma.interview.findUnique({
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
            project: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    return interview;
  }

  async update(id: string, updateInterviewDto: UpdateInterviewDto) {
    const interview = await this.prisma.interview.findUnique({
      where: { id },
    });

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    const updatedInterview = await this.prisma.interview.update({
      where: { id },
      data: updateInterviewDto,
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
            project: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    return updatedInterview;
  }

  async remove(id: string) {
    const interview = await this.prisma.interview.findUnique({
      where: { id },
    });

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    await this.prisma.interview.delete({
      where: { id },
    });
  }
}
