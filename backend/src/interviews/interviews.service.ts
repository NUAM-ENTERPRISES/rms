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
import { QueryUpcomingInterviewsDto } from './dto/query-upcoming-interviews.dto';

@Injectable()
export class InterviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createInterviewDto: CreateInterviewDto, scheduledBy: string) {
    // Scheduling now strictly requires a candidate-project map id
    if (!createInterviewDto.candidateProjectMapId) {
      throw new BadRequestException('candidateProjectMapId is required');
    }

    const candidateProjectMap = await this.prisma.candidateProjects.findUnique({
      where: { id: createInterviewDto.candidateProjectMapId },
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, title: true } },
      },
    });

    if (!candidateProjectMap) {
      throw new BadRequestException('Candidate-project combination not found');
    }

    // Check if interview already exists for this time slot
    const existingInterview = await this.prisma.interview.findFirst({
      where: {
        candidateProjectMapId: createInterviewDto.candidateProjectMapId,
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
      // Ensure meetingLink exists for video mode (generate if not provided)
      const generateMeetingLink = () => `https://meet.affiniks.com/${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`;

      const meetingLinkToUse = createInterviewDto.meetingLink ?? (createInterviewDto.mode === 'video' ? generateMeetingLink() : undefined);

      const created = await tx.interview.create({
        data: {
          ...createInterviewDto,
          interviewer: scheduledBy,
          meetingLink: meetingLinkToUse,
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
        },
      });

      // If candidateProjectMapId present - update candidate project sub-status + write status history
      if (createInterviewDto.candidateProjectMapId) {
        // get previous main/sub status snapshot from the candidate project (use tx for consistency)
        const prevAssignment = await tx.candidateProjects.findUnique({
          where: { id: createInterviewDto.candidateProjectMapId },
          include: { mainStatus: true, subStatus: true },
        });

        // find the sub-status entity for 'interview_scheduled'
        const scheduledSub = await tx.candidateProjectSubStatus.findUnique({
          where: { name: CANDIDATE_PROJECT_STATUS.INTERVIEW_SCHEDULED },
        });

        console.log('Scheduled sub-status:', scheduledSub);

        // update only the subStatus on the candidate project - do not change mainStatus
        await tx.candidateProjects.update({
          where: { id: createInterviewDto.candidateProjectMapId },
          data: {
            subStatus: { connect: { id: scheduledSub?.id } },
          },
        });

        // write a CandidateProjectStatusHistory entry with snapshots and ids
        await tx.candidateProjectStatusHistory.create({
          data: {
            candidateProjectMapId: createInterviewDto.candidateProjectMapId,
            changedById: scheduledBy ?? null,
            changedByName: schedulerName ?? null,

            mainStatusId: prevAssignment?.mainStatus?.id ?? null,
            subStatusId: scheduledSub?.id ?? null,

            mainStatusSnapshot: prevAssignment?.mainStatus?.label ?? null,
            subStatusSnapshot:
              scheduledSub?.label ?? CANDIDATE_PROJECT_STATUS.INTERVIEW_SCHEDULED,

            reason: `Interview scheduled${schedulerName ? ` by ${schedulerName}` : scheduledBy ? ` by ${scheduledBy}` : ''}`,
          },
        });

        // record interview history event and link it to the candidate-project map
        await tx.interviewStatusHistory.create({
          data: {
            interviewId: created.id,
            interviewType: 'client',
            candidateProjectMapId: createInterviewDto.candidateProjectMapId,
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

  /**
   * Return candidate-project assignments that were set to 'interview_assigned',
   * ordered by the most recent assignment (assignedAt desc).
   * Supports pagination and optional filters.
   */
  async getAssignedCandidateProjects(query: any) {
    const { page = 1, limit = 10, projectId, candidateId, recruiterId, search, subStatus, includeScheduled } = query;

    const where: any = {};

    // Determine subStatus filter
    const defaultSub = 'interview_assigned';
    if (subStatus) {
      where.subStatus = { is: { name: subStatus } };
    } else if (includeScheduled) {
      where.subStatus = { is: { name: { in: [defaultSub, 'interview_scheduled'] } } };
    } else {
      where.subStatus = { is: { name: defaultSub } };
    }

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

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Return interviews tied to candidate-project maps whose subStatus is 'interview_scheduled'.
   * Supports pagination, search, roleNeeded filter, date range and other optional filters.
   */
  async getUpcomingInterviews(query: QueryUpcomingInterviewsDto) {
    const { page = 1, limit = 10, projectId, candidateId, recruiterId, search, roleNeeded, startDate, endDate } = query as any;

    const where: any = {};

    // Candidate project map must have subStatus as 'interview_scheduled'
    where.candidateProjectMap = {
      is: {
        subStatus: { is: { name: 'interview_scheduled' } },
      },
    };

    // Additional filters on candidateProjectMap
    if (projectId) where.candidateProjectMap.is.projectId = projectId;
    if (candidateId) where.candidateProjectMap.is.candidateId = candidateId;
    if (recruiterId) where.candidateProjectMap.is.recruiterId = recruiterId;

    if (roleNeeded) {
      // allow roleNeeded to be an id or a text to match designation
      where.candidateProjectMap.is.OR = [
        { roleNeededId: roleNeeded },
        { roleNeeded: { is: { designation: { contains: roleNeeded, mode: 'insensitive' } } } },
      ];
    }

    // Date filtering for interview scheduledTime
    // If startDate or endDate are provided filter by them. Otherwise don't apply a scheduledTime
    // filter so we return all scheduled interviews (including past/expired ones).
    if (startDate || endDate) {
      where.scheduledTime = {};
      if (startDate) where.scheduledTime.gte = new Date(startDate);
      if (endDate) where.scheduledTime.lte = new Date(endDate);
    }

    // Search across candidate/project/role
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const s = search.trim();
      where.OR = [
        { candidateProjectMap: { is: { id: { contains: s, mode: 'insensitive' } } } },
        { candidateProjectMap: { is: { candidate: { firstName: { contains: s, mode: 'insensitive' } } } } },
        { candidateProjectMap: { is: { candidate: { lastName: { contains: s, mode: 'insensitive' } } } } },
        { candidateProjectMap: { is: { candidate: { email: { contains: s, mode: 'insensitive' } } } } },
        { candidateProjectMap: { is: { project: { title: { contains: s, mode: 'insensitive' } } } } },
        { candidateProjectMap: { is: { roleNeeded: { designation: { contains: s, mode: 'insensitive' } } } } },
      ];
    }

    const total = await this.prisma.interview.count({ where });

    const interviews = await this.prisma.interview.findMany({
      where,
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
        project: { select: { id: true, title: true } },
      },
      orderBy: { scheduledTime: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    // Append 'expired' flag to interviews where scheduledTime < now
    const now = new Date();
    const interviewsWithExpired = interviews.map((iv) => ({
      ...iv,
      expired: iv.scheduledTime ? new Date(iv.scheduledTime).getTime() < now.getTime() : false,
    }));

    return {
      interviews: interviewsWithExpired,
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

    // If mode is being changed to video and no meetingLink provided, generate one
    const generateMeetingLink = () => `https://meet.affiniks.com/${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`;
    const dataToUpdate: any = { ...updateInterviewDto };
    if (updateInterviewDto.mode === 'video' && !updateInterviewDto.meetingLink && !interview.meetingLink) {
      dataToUpdate.meetingLink = generateMeetingLink();
    }

    const updatedInterview = await this.prisma.interview.update({
      where: { id },
      data: dataToUpdate,
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
