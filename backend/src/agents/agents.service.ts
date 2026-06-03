import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { QueryAgentsDto } from './dto/query-agents.dto';
import { QueryAgentCandidatesDto } from './dto/query-agent-candidates.dto';
import { QueryAgentInterviewPassedCandidatesDto } from './dto/query-agent-interview-passed-candidates.dto';
import { QueryAgentProjectsDto } from './dto/query-agent-projects.dto';
import { LinkAgentProjectsDto } from './dto/link-agent-projects.dto';
import { UpdateAgentProjectDto } from './dto/update-agent-project.dto';
import { CANDIDATE_PROJECT_STATUS } from '../common/constants/statuses';

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  private interviewPassedHistoryEntryWhere(): Prisma.CandidateProjectStatusHistoryWhereInput {
    return {
      OR: [
        { subStatus: { name: CANDIDATE_PROJECT_STATUS.INTERVIEW_PASSED } },
        {
          subStatusSnapshot: {
            equals: CANDIDATE_PROJECT_STATUS.INTERVIEW_PASSED,
            mode: 'insensitive',
          },
        },
      ],
    };
  }

  private buildCandidateSearchOr(search: string): Prisma.CandidateWhereInput['OR'] {
    return [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { mobileNumber: { contains: search, mode: 'insensitive' } },
      { passportNumber: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  private async assertAgentExists(id: string) {
    const agent = await this.prisma.agent.findUnique({ where: { id } });
    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }
    return agent;
  }

  private async countInterviewPassedCandidates(agentId: string): Promise<number> {
    return this.prisma.candidate.count({
      where: {
        agentId,
        projects: {
          some: {
            projectStatusHistory: {
              some: this.interviewPassedHistoryEntryWhere(),
            },
          },
        },
      },
    });
  }

  private async loadInterviewPassedProjectsByCandidateIds(
    candidateIds: string[],
  ): Promise<
    Map<
      string,
      Array<{ projectId: string; projectTitle: string | null; passedAt: string }>
    >
  > {
    if (candidateIds.length === 0) {
      return new Map();
    }

    const histories = await this.prisma.candidateProjectStatusHistory.findMany({
      where: {
        ...this.interviewPassedHistoryEntryWhere(),
        candidateProjectMap: {
          candidateId: { in: candidateIds },
        },
      },
      orderBy: { statusChangedAt: 'desc' },
      select: {
        statusChangedAt: true,
        candidateProjectMap: {
          select: {
            candidateId: true,
            projectId: true,
            project: { select: { title: true } },
          },
        },
      },
    });

    const grouped = new Map<
      string,
      Array<{ projectId: string; projectTitle: string | null; passedAt: string }>
    >();

    for (const entry of histories) {
      const candidateId = entry.candidateProjectMap.candidateId;
      const projectId = entry.candidateProjectMap.projectId;
      const passedAt = entry.statusChangedAt.toISOString();
      const projectTitle = entry.candidateProjectMap.project?.title ?? null;

      const existing = grouped.get(candidateId) ?? [];
      if (existing.some((p) => p.projectId === projectId)) {
        continue;
      }

      existing.push({ projectId, projectTitle, passedAt });
      grouped.set(candidateId, existing);
    }

    return grouped;
  }

  async create(createAgentDto: CreateAgentDto) {
    const { projectLinks, ...agentData } = createAgentDto;

    const agent = await this.prisma.$transaction(async (tx) => {
      const created = await tx.agent.create({
        data: agentData,
      });

      if (projectLinks && projectLinks.length > 0) {
        const merged = new Map<string, string | undefined>();
        for (const item of projectLinks) {
          merged.set(item.projectId, item.notes);
        }
        const projectIds = [...merged.keys()];

        const projects = await tx.project.findMany({
          where: { id: { in: projectIds } },
          select: { id: true },
        });
        const found = new Set(projects.map((p) => p.id));
        const missing = projectIds.filter((id) => !found.has(id));
        if (missing.length > 0) {
          throw new BadRequestException(
            `Project(s) not found: ${missing.join(', ')}`,
          );
        }

        for (const projectId of projectIds) {
          await tx.agentProject.upsert({
            where: {
              agentId_projectId: { agentId: created.id, projectId },
            },
            create: {
              agentId: created.id,
              projectId,
              notes: merged.get(projectId),
              isActive: true,
            },
            update: {
              notes: merged.get(projectId),
              isActive: true,
            },
          });
        }
      }

      return created;
    });

    return {
      success: true,
      message: 'Agent created successfully',
      data: agent,
    };
  }

  async findAll(query: QueryAgentsDto) {
    const { search, isActive, agentType, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (agentType) {
      where.agentType = agentType;
    }

    const [total, agents] = await Promise.all([
      this.prisma.agent.count({ where }),
      this.prisma.agent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { candidates: true },
          },
        },
      }),
    ]);

    return {
      success: true,
      message: 'Agents retrieved successfully',
      data: agents,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
      include: {
        country: { select: { code: true, name: true } },
        _count: {
          select: { candidates: true, agentProjects: true },
        },
      },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }

    return {
      success: true,
      message: 'Agent retrieved successfully',
      data: agent,
    };
  }

  async getAgentCandidateStats(id: string) {
    await this.assertAgentExists(id);

    const [totalCandidates, interviewPassedCandidates, linkedProjects] =
      await Promise.all([
        this.prisma.candidate.count({ where: { agentId: id } }),
        this.countInterviewPassedCandidates(id),
        this.prisma.agentProject.count({ where: { agentId: id } }),
      ]);

    return {
      success: true,
      message: 'Agent candidate stats retrieved successfully',
      data: {
        totalCandidates,
        interviewPassedCandidates,
        linkedProjects,
      },
    };
  }

  async update(id: string, updateAgentDto: UpdateAgentDto) {
    try {
      const agent = await this.prisma.agent.update({
        where: { id },
        data: updateAgentDto,
      });
      return {
        success: true,
        message: 'Agent updated successfully',
        data: agent,
      };
    } catch (error) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.agent.delete({
        where: { id },
      });
      return {
        success: true,
        message: 'Agent deleted successfully',
      };
    } catch (error) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }
  }

  async getAgentCandidates(id: string, query: QueryAgentCandidatesDto) {
    await this.assertAgentExists(id);

    const { search, status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CandidateWhereInput = { agentId: id };

    if (search) {
      where.OR = this.buildCandidateSearchOr(search);
    }

    if (status) {
      where.currentStatus = { statusName: { equals: status, mode: 'insensitive' } };
    }

    const [total, candidates] = await Promise.all([
      this.prisma.candidate.count({ where }),
      this.prisma.candidate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          countryCode: true,
          mobileNumber: true,
          passportNumber: true,
          email: true,
          profileImage: true,
          createdAt: true,
          currentStatus: {
            select: { id: true, statusName: true },
          },
          projects: {
            orderBy: { createdAt: 'desc' },
            take: 30,
            select: {
              id: true,
              projectId: true,
              project: { select: { id: true, title: true } },
              mainStatus: { select: { name: true, label: true } },
              subStatus: { select: { name: true, label: true } },
            },
          },
          agentCandidateDeclaredProjects: {
            orderBy: { createdAt: 'desc' },
            take: 30,
            select: {
              id: true,
              projectId: true,
              project: { select: { id: true, title: true } },
            },
          },
          recruiterAssignments: {
            where: { isActive: true },
            take: 1,
            select: {
              recruiter: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      }),
    ]);

    const data = candidates.map((c) => {
      const { recruiterAssignments, projects, agentCandidateDeclaredProjects, ...rest } = c;
      return {
        ...rest,
        contact: `${c.countryCode ?? ''}${c.mobileNumber ?? ''}`,
        recruiter: recruiterAssignments[0]?.recruiter ?? null,
        candidateProjects: projects.map((p) => ({
          id: p.id,
          projectId: p.projectId,
          projectTitle: p.project?.title ?? null,
          mainStatusLabel: p.mainStatus?.label ?? p.mainStatus?.name ?? null,
          mainStatusName: p.mainStatus?.name ?? null,
          subStatusLabel: p.subStatus?.label ?? p.subStatus?.name ?? null,
          subStatusName: p.subStatus?.name ?? null,
        })),
        declaredProjects: (agentCandidateDeclaredProjects || []).map((d) => ({
          id: d.id,
          projectId: d.projectId,
          projectTitle: d.project?.title ?? null,
        })),
      };
    });

    return {
      success: true,
      message: 'Agent candidates retrieved successfully',
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAgentInterviewPassedCandidates(
    id: string,
    query: QueryAgentInterviewPassedCandidatesDto,
  ) {
    await this.assertAgentExists(id);

    const { search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CandidateWhereInput = {
      AND: [
        { agentId: id },
        {
          projects: {
            some: {
              projectStatusHistory: {
                some: this.interviewPassedHistoryEntryWhere(),
              },
            },
          },
        },
        ...(search ? [{ OR: this.buildCandidateSearchOr(search) }] : []),
      ],
    };

    const [total, candidates] = await Promise.all([
      this.prisma.candidate.count({ where }),
      this.prisma.candidate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          countryCode: true,
          mobileNumber: true,
          passportNumber: true,
          email: true,
          profileImage: true,
          createdAt: true,
          currentStatus: {
            select: { id: true, statusName: true },
          },
          agentCandidateDeclaredProjects: {
            orderBy: { createdAt: 'desc' },
            take: 30,
            select: {
              id: true,
              projectId: true,
              project: { select: { id: true, title: true } },
            },
          },
          recruiterAssignments: {
            where: { isActive: true },
            take: 1,
            select: {
              recruiter: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      }),
    ]);

    const passedProjectsByCandidate = await this.loadInterviewPassedProjectsByCandidateIds(
      candidates.map((c) => c.id),
    );

    const data = candidates.map((c) => {
      const { recruiterAssignments, agentCandidateDeclaredProjects, ...rest } = c;
      const interviewPassedProjects = passedProjectsByCandidate.get(c.id) ?? [];

      return {
        ...rest,
        contact: `${c.countryCode ?? ''}${c.mobileNumber ?? ''}`,
        recruiter: recruiterAssignments[0]?.recruiter ?? null,
        interviewPassedCount: interviewPassedProjects.length,
        interviewPassedProjects,
        declaredProjects: (agentCandidateDeclaredProjects || []).map((d) => ({
          id: d.id,
          projectId: d.projectId,
          projectTitle: d.project?.title ?? null,
        })),
      };
    });

    return {
      success: true,
      message: 'Agent interview passed candidates retrieved successfully',
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAgentProjects(
    agentId: string,
    query: QueryAgentProjectsDto = new QueryAgentProjectsDto(),
  ) {
    const agent = await this.prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const trimmedSearch = query.search?.trim();

    const where: Prisma.AgentProjectWhereInput = { agentId };
    if (trimmedSearch) {
      where.project = {
        OR: [
          { title: { contains: trimmedSearch, mode: 'insensitive' } },
          {
            client: {
              name: { contains: trimmedSearch, mode: 'insensitive' },
            },
          },
        ],
      };
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.agentProject.count({ where }),
      this.prisma.agentProject.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          project: {
            select: {
              id: true,
              title: true,
              status: true,
              client: { select: { id: true, name: true, type: true } },
            },
          },
        },
      }),
    ]);

    return {
      success: true,
      message: 'Agent projects retrieved successfully',
      data: rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async linkAgentProjects(agentId: string, dto: LinkAgentProjectsDto) {
    const agent = await this.prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    const merged = new Map<string, string | undefined>();
    for (const item of dto.links) {
      merged.set(item.projectId, item.notes);
    }
    const projectIds = [...merged.keys()];

    const projects = await this.prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true },
    });
    const found = new Set(projects.map((p) => p.id));
    const missing = projectIds.filter((id) => !found.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Project(s) not found: ${missing.join(', ')}`,
      );
    }

    await this.prisma.$transaction(
      projectIds.map((projectId) =>
        this.prisma.agentProject.upsert({
          where: {
            agentId_projectId: { agentId, projectId },
          },
          create: {
            agentId,
            projectId,
            notes: merged.get(projectId),
            isActive: true,
          },
          update: {
            notes: merged.get(projectId),
            isActive: true,
          },
        }),
      ),
    );

    return this.getAgentProjects(agentId, { page: 1, limit: 500 });
  }

  async unlinkAgentProject(agentId: string, projectId: string) {
    const agent = await this.prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    const result = await this.prisma.agentProject.deleteMany({
      where: { agentId, projectId },
    });
    if (result.count === 0) {
      throw new NotFoundException(
        `No link found between agent ${agentId} and project ${projectId}`,
      );
    }

    return {
      success: true,
      message: 'Agent project link removed successfully',
    };
  }

  async updateAgentProject(
    agentId: string,
    projectId: string,
    dto: UpdateAgentProjectDto,
  ) {
    const agent = await this.prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    try {
      const updated = await this.prisma.agentProject.update({
        where: {
          agentId_projectId: { agentId, projectId },
        },
        data: {
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
        include: {
          project: {
            select: {
              id: true,
              title: true,
              status: true,
              client: { select: { id: true, name: true, type: true } },
            },
          },
        },
      });
      return {
        success: true,
        message: 'Agent project updated successfully',
        data: updated,
      };
    } catch {
      throw new NotFoundException(
        `No link found between agent ${agentId} and project ${projectId}`,
      );
    }
  }
}
