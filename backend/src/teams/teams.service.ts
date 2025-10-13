import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { QueryTeamsDto } from './dto/query-teams.dto';
import { AssignUserDto } from './dto/assign-user.dto';
import { CreateTransferRequestDto } from './dto/create-transfer-request.dto';
import { ProcessTransferRequestDto } from './dto/process-transfer-request.dto';
import { QueryTransferRequestsDto } from './dto/query-transfer-requests.dto';
import {
  TransferRequestResponseDto,
  PaginatedTransferRequestsResponseDto,
} from './dto/transfer-request-response.dto';
import { TeamWithRelations, PaginatedTeams, TeamStats } from './types';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createTeamDto: CreateTeamDto,
    userId: string,
  ): Promise<TeamWithRelations> {
    // Check if team name already exists
    const existingTeam = await this.prisma.team.findUnique({
      where: { name: createTeamDto.name },
    });

    if (existingTeam) {
      throw new ConflictException(
        `Team with name "${createTeamDto.name}" already exists`,
      );
    }

    // Validate leadership positions if provided
    if (createTeamDto.leadId) {
      const leadUser = await this.prisma.user.findUnique({
        where: { id: createTeamDto.leadId },
      });
      if (!leadUser) {
        throw new NotFoundException(
          `User with ID ${createTeamDto.leadId} not found`,
        );
      }
    }

    if (createTeamDto.headId) {
      const headUser = await this.prisma.user.findUnique({
        where: { id: createTeamDto.headId },
      });
      if (!headUser) {
        throw new NotFoundException(
          `User with ID ${createTeamDto.headId} not found`,
        );
      }
    }

    if (createTeamDto.managerId) {
      const managerUser = await this.prisma.user.findUnique({
        where: { id: createTeamDto.managerId },
      });
      if (!managerUser) {
        throw new NotFoundException(
          `User with ID ${createTeamDto.managerId} not found`,
        );
      }
    }

    // Create team
    const team = await this.prisma.team.create({
      data: {
        name: createTeamDto.name,
        leadId: createTeamDto.leadId,
        headId: createTeamDto.headId,
        managerId: createTeamDto.managerId,
      },
      include: {
        userTeams: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        projects: true,
        candidates: true,
      },
    });

    return team;
  }

  async findAll(queryDto: QueryTeamsDto): Promise<PaginatedTeams> {
    const {
      page = 1,
      limit = 10,
      search,
      leadId,
      headId,
      managerId,
      userId,
      sortBy = 'name',
      sortOrder = 'asc',
    } = queryDto;

    // Build where clause
    const where: any = {};

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (leadId) {
      where.leadId = leadId;
    }

    if (headId) {
      where.headId = headId;
    }

    if (managerId) {
      where.managerId = managerId;
    }

    if (userId) {
      where.members = {
        some: {
          userId: userId,
        },
      };
    }

    // Get total count
    const total = await this.prisma.team.count({ where });

    // Calculate pagination
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Get teams with relations
    const teams = await this.prisma.team.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        userTeams: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        projects: true,
        candidates: true,
      },
    });

    return {
      teams,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findOne(id: string): Promise<TeamWithRelations> {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        userTeams: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        projects: true,
        candidates: true,
      },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    return team;
  }

  async update(
    id: string,
    updateTeamDto: UpdateTeamDto,
    userId: string,
  ): Promise<TeamWithRelations> {
    // Check if team exists
    const existingTeam = await this.prisma.team.findUnique({
      where: { id },
    });

    if (!existingTeam) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    // Check if name is being updated and if it already exists
    if (updateTeamDto.name && updateTeamDto.name !== existingTeam.name) {
      const teamWithName = await this.prisma.team.findUnique({
        where: { name: updateTeamDto.name },
      });

      if (teamWithName) {
        throw new ConflictException(
          `Team with name "${updateTeamDto.name}" already exists`,
        );
      }
    }

    // Validate leadership positions if provided
    if (updateTeamDto.leadId) {
      const leadUser = await this.prisma.user.findUnique({
        where: { id: updateTeamDto.leadId },
      });
      if (!leadUser) {
        throw new NotFoundException(
          `User with ID ${updateTeamDto.leadId} not found`,
        );
      }
    }

    if (updateTeamDto.headId) {
      const headUser = await this.prisma.user.findUnique({
        where: { id: updateTeamDto.headId },
      });
      if (!headUser) {
        throw new NotFoundException(
          `User with ID ${updateTeamDto.headId} not found`,
        );
      }
    }

    if (updateTeamDto.managerId) {
      const managerUser = await this.prisma.user.findUnique({
        where: { id: updateTeamDto.managerId },
      });
      if (!managerUser) {
        throw new NotFoundException(
          `User with ID ${updateTeamDto.managerId} not found`,
        );
      }
    }

    // Build update data
    const updateData: any = {};
    if (updateTeamDto.name) updateData.name = updateTeamDto.name;
    if (updateTeamDto.leadId !== undefined)
      updateData.leadId = updateTeamDto.leadId;
    if (updateTeamDto.headId !== undefined)
      updateData.headId = updateTeamDto.headId;
    if (updateTeamDto.managerId !== undefined)
      updateData.managerId = updateTeamDto.managerId;

    // Update team
    const team = await this.prisma.team.update({
      where: { id },
      data: updateData,
      include: {
        userTeams: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        projects: true,
        candidates: true,
      },
    });

    return team;
  }

  async remove(
    id: string,
    userId: string,
  ): Promise<{ id: string; message: string }> {
    // Check if team exists
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        projects: true,
        candidates: true,
        userTeams: true,
      },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    // Check if team has projects
    if (team.projects.length > 0) {
      throw new ConflictException(
        `Cannot delete team with ID ${id} because it has ${team.projects.length} project(s) assigned. Please reassign or delete the projects first.`,
      );
    }

    // Check if team has candidates
    if (team.candidates.length > 0) {
      throw new ConflictException(
        `Cannot delete team with ID ${id} because it has ${team.candidates.length} candidate(s) assigned. Please reassign the candidates first.`,
      );
    }

    // Delete team (members will be deleted automatically due to cascade)
    await this.prisma.team.delete({
      where: { id },
    });

    return {
      id,
      message: 'Team deleted successfully',
    };
  }

  async assignUser(
    teamId: string,
    assignUserDto: AssignUserDto,
    userId: string,
  ): Promise<{ message: string }> {
    // Check if team exists
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: assignUserDto.userId },
    });

    if (!user) {
      throw new NotFoundException(
        `User with ID ${assignUserDto.userId} not found`,
      );
    }

    // Check if user is already assigned to this team
    const existingAssignment = await this.prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId: assignUserDto.userId,
          teamId: teamId,
        },
      },
    });

    if (existingAssignment) {
      throw new ConflictException(
        `User ${assignUserDto.userId} is already assigned to team ${teamId}`,
      );
    }

    // Assign user to team
    await this.prisma.userTeam.create({
      data: {
        userId: assignUserDto.userId,
        teamId: teamId,
      },
    });

    return {
      message: 'User assigned to team successfully',
    };
  }

  async removeUser(
    teamId: string,
    userId: string,
    currentUserId: string,
  ): Promise<{ message: string }> {
    // Check if team exists
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if user is assigned to this team
    const assignment = await this.prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId: userId,
          teamId: teamId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        `User ${userId} is not assigned to team ${teamId}`,
      );
    }

    // Remove user from team
    await this.prisma.userTeam.delete({
      where: {
        userId_teamId: {
          userId: userId,
          teamId: teamId,
        },
      },
    });

    return {
      message: 'User removed from team successfully',
    };
  }

  async getTeamMembers(teamId: string): Promise<any[]> {
    // Check if team exists
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    // Get team members
    const members = await this.prisma.userTeam.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            dateOfBirth: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    });

    return members;
  }

  async getTeamStats(): Promise<TeamStats> {
    // Get total teams
    const totalTeams = await this.prisma.team.count();

    // Get teams with leadership positions
    const [teamsWithLeads, teamsWithHeads, teamsWithManagers] =
      await Promise.all([
        this.prisma.team.count({ where: { leadId: { not: null } } }),
        this.prisma.team.count({ where: { headId: { not: null } } }),
        this.prisma.team.count({ where: { managerId: { not: null } } }),
      ]);

    // Get team member counts
    const teamMemberCounts = await this.prisma.userTeam.groupBy({
      by: ['teamId'],
      _count: { userId: true },
    });

    const teamsByMemberCount = teamMemberCounts.reduce(
      (acc, item) => {
        const count = item._count.userId.toString();
        acc[count] = (acc[count] || 0) + 1;
        return acc;
      },
      {} as { [memberCount: string]: number },
    );

    const averageTeamSize =
      teamMemberCounts.length > 0
        ? teamMemberCounts.reduce((sum, item) => sum + item._count.userId, 0) /
          teamMemberCounts.length
        : 0;

    // Get teams with projects and candidates
    const [teamsWithProjects, teamsWithCandidates] = await Promise.all([
      this.prisma.team.count({
        where: {
          projects: {
            some: {},
          },
        },
      }),
      this.prisma.team.count({
        where: {
          candidates: {
            some: {},
          },
        },
      }),
    ]);

    // Get average projects and candidates per team
    const [totalProjects, totalCandidates] = await Promise.all([
      this.prisma.project.count(),
      this.prisma.candidate.count(),
    ]);

    const averageProjectsPerTeam =
      totalTeams > 0 ? totalProjects / totalTeams : 0;
    const averageCandidatesPerTeam =
      totalTeams > 0 ? totalCandidates / totalTeams : 0;

    return {
      totalTeams,
      teamsWithLeads,
      teamsWithHeads,
      teamsWithManagers,
      averageTeamSize,
      teamsByMemberCount,
      teamsWithProjects,
      teamsWithCandidates,
      averageProjectsPerTeam,
      averageCandidatesPerTeam,
    };
  }

  async getTeamProjects(teamId: string): Promise<any[]> {
    // Get projects where team members are assigned
    const teamProjects = await this.prisma.project.findMany({
      where: {
        teamId: teamId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        candidateProjects: {
          select: {
            id: true,
          },
        },
        rolesNeeded: {
          select: {
            id: true,
          },
        },
      },
    });

    return teamProjects.map((project) => ({
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      priority: project.priority,
      deadline: project.deadline,
      client: project.client,
      candidatesAssigned: project.candidateProjects.length,
      rolesNeeded: project.rolesNeeded.length,
      progress: 0, // TODO: Calculate actual progress
    }));
  }

  async getTeamCandidates(teamId: string): Promise<any[]> {
    // Get candidates assigned to projects where team members are working
    const teamCandidates = await this.prisma.candidate.findMany({
      where: {
        projects: {
          some: {
            project: {
              teamId: teamId,
            },
          },
        },
      },
      include: {
        projects: {
          include: {
            project: {
              select: {
                id: true,
                title: true,
                client: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        recruiter: {
          select: {
            id: true,
            name: true,
            userRoles: {
              include: {
                role: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return teamCandidates.map((candidate) => ({
      id: candidate.id,
      name: `${candidate.firstName} ${candidate.lastName}`,
      contact: candidate.contact,
      email: candidate.email,
      currentStatus: candidate.currentStatus,
      experience: candidate.totalExperience || 0,
      skills: candidate.skills || [],
      assignedProject: {
        id: candidate.projects[0]?.project.id,
        title: candidate.projects[0]?.project.title,
        client: candidate.projects[0]?.project.client,
      },
      assignedBy: {
        id: candidate.recruiter?.id || 'unknown',
        name: candidate.recruiter?.name || 'Unknown',
        role: candidate.recruiter?.userRoles?.[0]?.role?.name || 'Unknown',
      },
      lastActivity: candidate.updatedAt.toISOString(),
      nextInterview: null, // TODO: Add nextInterview field to schema if needed
    }));
  }

  async getTeamStatsById(teamId: string): Promise<any> {
    // Get team members count
    const teamMembers = await this.prisma.userTeam.count({
      where: { teamId },
    });

    // Get projects count
    const projects = await this.prisma.project.findMany({
      where: {
        teamId: teamId,
      },
    });

    const activeProjects = projects.filter((p) => p.status === 'active').length;
    const completedProjects = projects.filter(
      (p) => p.status === 'completed',
    ).length;

    // Get candidates count
    const candidates = await this.prisma.candidate.count({
      where: {
        projects: {
          some: {
            project: {
              teamId: teamId,
            },
          },
        },
      },
    });

    return {
      totalMembers: teamMembers,
      activeProjects,
      totalCandidates: candidates,
      averageSuccessRate: 0, // TODO: Calculate from actual data
      totalRevenue: 0, // TODO: Calculate from actual data
      monthlyGrowth: 0, // TODO: Calculate from actual data
      completionRate:
        projects.length > 0 ? (completedProjects / projects.length) * 100 : 0,
      totalProjects: projects.length,
      completedProjects,
    };
  }

  async getTeamPerformanceAnalytics(teamId: string): Promise<any> {
    // Get performance data for the last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Get projects created in the last 12 months for this team
    const projects = await this.prisma.project.findMany({
      where: {
        teamId: teamId,
        createdAt: {
          gte: twelveMonthsAgo,
        },
      },
      include: {
        candidateProjects: {
          include: {
            candidate: true,
          },
        },
      },
    });

    // Define the type for monthly data
    interface MonthlyData {
      month: string;
      placements: number;
      revenue: number;
      projects: number;
      candidates: number;
    }

    // Group by month and calculate metrics
    const monthlyData: MonthlyData[] = [];
    for (let i = 11; i >= 0; i--) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      const monthProjects = projects.filter(
        (p) => p.createdAt >= monthStart && p.createdAt <= monthEnd,
      );

      const placements = monthProjects.reduce(
        (acc, project) =>
          acc +
          project.candidateProjects.filter((cp) => cp.status === 'hired')
            .length,
        0,
      );

      const revenue = monthProjects.reduce((acc, project) => {
        // Calculate revenue based on hired candidates
        const hiredCandidates = project.candidateProjects.filter(
          (cp) => cp.status === 'hired',
        );
        return acc + hiredCandidates.length * 50000; // Assume $50k per placement
      }, 0);

      monthlyData.push({
        month: month.toISOString().substring(0, 7), // YYYY-MM format
        placements,
        revenue,
        projects: monthProjects.length,
        candidates: monthProjects.reduce(
          (acc, project) => acc + project.candidateProjects.length,
          0,
        ),
      });
    }

    return {
      monthlyData,
      totalPlacements: monthlyData.reduce(
        (acc, month) => acc + month.placements,
        0,
      ),
      totalRevenue: monthlyData.reduce((acc, month) => acc + month.revenue, 0),
      averageMonthlyPlacements:
        monthlyData.reduce((acc, month) => acc + month.placements, 0) / 12,
    };
  }

  async getTeamSuccessRateDistribution(teamId: string): Promise<any> {
    // Get all candidates for this team's projects
    const candidates = await this.prisma.candidate.findMany({
      where: {
        projects: {
          some: {
            project: {
              teamId: teamId,
            },
          },
        },
      },
      include: {
        projects: {
          include: {
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

    // Calculate success rate distribution
    const totalCandidates = candidates.length;
    const hiredCandidates = candidates.filter((c) =>
      c.projects.some((cp) => cp.status === 'hired'),
    ).length;
    const inProgressCandidates = candidates.filter((c) =>
      c.projects.some((cp) =>
        ['nominated', 'documents_submitted', 'interview_scheduled'].includes(
          cp.status,
        ),
      ),
    ).length;
    const rejectedCandidates = candidates.filter((c) =>
      c.projects.some((cp) =>
        [
          'rejected_documents',
          'rejected_interview',
          'rejected_selection',
        ].includes(cp.status),
      ),
    ).length;

    return {
      totalCandidates,
      hired: hiredCandidates,
      inProgress: inProgressCandidates,
      rejected: rejectedCandidates,
      successRate:
        totalCandidates > 0 ? (hiredCandidates / totalCandidates) * 100 : 0,
      distribution: {
        hired:
          totalCandidates > 0 ? (hiredCandidates / totalCandidates) * 100 : 0,
        inProgress:
          totalCandidates > 0
            ? (inProgressCandidates / totalCandidates) * 100
            : 0,
        rejected:
          totalCandidates > 0
            ? (rejectedCandidates / totalCandidates) * 100
            : 0,
      },
    };
  }

  // Transfer Request Methods
  async createTransferRequest(
    fromTeamId: string,
    createTransferRequestDto: CreateTransferRequestDto,
    requestedBy: string,
  ): Promise<TransferRequestResponseDto> {
    const { userId, toTeamId, reason } = createTransferRequestDto;

    // Validate that user is in the source team
    const userTeam = await this.prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId: fromTeamId,
        },
      },
    });

    if (!userTeam) {
      throw new NotFoundException('User is not a member of the source team');
    }

    // Validate target team exists
    const targetTeam = await this.prisma.team.findUnique({
      where: { id: toTeamId },
    });

    if (!targetTeam) {
      throw new NotFoundException('Target team not found');
    }

    // Check if user is already in target team
    const existingMembership = await this.prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId: toTeamId,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictException(
        'User is already a member of the target team',
      );
    }

    // Check for existing pending transfer request
    const existingRequest = await this.prisma.teamTransferRequest.findFirst({
      where: {
        userId,
        status: 'pending',
      },
    });

    if (existingRequest) {
      throw new ConflictException(
        'User already has a pending transfer request',
      );
    }

    // Create transfer request
    const transferRequest = await this.prisma.teamTransferRequest.create({
      data: {
        userId,
        fromTeamId,
        toTeamId,
        requestedBy,
        reason,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        fromTeam: {
          select: {
            id: true,
            name: true,
          },
        },
        toTeam: {
          select: {
            id: true,
            name: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create outbox event for notification
    await this.prisma.outboxEvent.create({
      data: {
        type: 'MemberTransferRequested',
        payload: {
          transferId: transferRequest.id,
          userId,
          fromTeamId,
          toTeamId,
          requestedBy,
        },
      },
    });

    return this.mapTransferRequestToResponse(transferRequest);
  }

  async getTransferRequests(
    teamId: string,
    query: QueryTransferRequestsDto,
    userId: string,
  ): Promise<PaginatedTransferRequestsResponseDto> {
    const { status, limit = 20, offset = 0 } = query;

    // Check if user has access to this team's transfer requests
    const userTeam = await this.prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    });

    if (!userTeam) {
      throw new NotFoundException(
        'Access denied: User is not a member of this team',
      );
    }

    const where: any = {
      OR: [{ fromTeamId: teamId }, { toTeamId: teamId }],
    };

    if (status) {
      where.status = status;
    }

    const [transferRequests, total] = await Promise.all([
      this.prisma.teamTransferRequest.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          fromTeam: {
            select: {
              id: true,
              name: true,
            },
          },
          toTeam: {
            select: {
              id: true,
              name: true,
            },
          },
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.prisma.teamTransferRequest.count({ where }),
    ]);

    return {
      transferRequests: transferRequests.map(this.mapTransferRequestToResponse),
      total,
      count: transferRequests.length,
      offset,
    };
  }

  async processTransferRequest(
    teamId: string,
    requestId: string,
    action: 'approve' | 'reject',
    processTransferRequestDto: ProcessTransferRequestDto,
    approverId: string,
  ): Promise<TransferRequestResponseDto> {
    const { reason } = processTransferRequestDto;

    // Find the transfer request
    const transferRequest = await this.prisma.teamTransferRequest.findFirst({
      where: {
        id: requestId,
        OR: [{ fromTeamId: teamId }, { toTeamId: teamId }],
        status: 'pending',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        fromTeam: {
          select: {
            id: true,
            name: true,
          },
        },
        toTeam: {
          select: {
            id: true,
            name: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!transferRequest) {
      throw new NotFoundException(
        'Transfer request not found or already processed',
      );
    }

    // Update transfer request
    const updatedRequest = await this.prisma.teamTransferRequest.update({
      where: { id: requestId },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
        approvedBy: approverId,
        approvedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        fromTeam: {
          select: {
            id: true,
            name: true,
          },
        },
        toTeam: {
          select: {
            id: true,
            name: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // If approved, transfer the user
    if (action === 'approve') {
      await this.prisma.$transaction(async (tx) => {
        // Remove user from source team
        await tx.userTeam.delete({
          where: {
            userId_teamId: {
              userId: transferRequest.userId,
              teamId: transferRequest.fromTeamId,
            },
          },
        });

        // Add user to target team
        await tx.userTeam.create({
          data: {
            userId: transferRequest.userId,
            teamId: transferRequest.toTeamId,
          },
        });
      });
    }

    return this.mapTransferRequestToResponse(updatedRequest);
  }

  async getUserTransferHistory(
    userId: string,
    currentUserId: string,
  ): Promise<TransferRequestResponseDto[]> {
    // Check if current user has access to view this user's transfer history
    // This could be enhanced with more specific RBAC rules
    const transferRequests = await this.prisma.teamTransferRequest.findMany({
      where: {
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        fromTeam: {
          select: {
            id: true,
            name: true,
          },
        },
        toTeam: {
          select: {
            id: true,
            name: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return transferRequests.map(this.mapTransferRequestToResponse);
  }

  private mapTransferRequestToResponse(
    transferRequest: any,
  ): TransferRequestResponseDto {
    return {
      id: transferRequest.id,
      user: transferRequest.user,
      fromTeam: transferRequest.fromTeam,
      toTeam: transferRequest.toTeam,
      requester: transferRequest.requester,
      status: transferRequest.status,
      reason: transferRequest.reason,
      approver: transferRequest.approver,
      approvedAt: transferRequest.approvedAt,
      createdAt: transferRequest.createdAt,
      updatedAt: transferRequest.updatedAt,
    };
  }
}
