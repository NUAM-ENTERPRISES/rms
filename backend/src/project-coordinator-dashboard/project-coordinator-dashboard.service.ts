import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  buildProjectRoleHiringRows,
  countFilledCandidatesForProjects,
} from '../common/dashboard/project-role-hiring.util';
import { getProjectCoordinatorClientIds } from '../common/scoping/project-coordinator-scope.util';
import {
  ClientProjectsQueryDto,
  ProjectRoleHiringStatusQueryDto,
} from './dto/project-coordinator-dashboard-query.dto';

@Injectable()
export class ProjectCoordinatorDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private async getMyProjectIds(userId: string): Promise<string[]> {
    const projects = await this.prisma.project.findMany({
      where: { createdBy: userId },
      select: { id: true },
    });
    return projects.map((project) => project.id);
  }

  private async getMyClientIds(userId: string): Promise<string[]> {
    return getProjectCoordinatorClientIds(this.prisma, userId);
  }

  async getStats(userId: string) {
    const [myClients, activeProjects, completedProjects, projectIds] =
      await Promise.all([
        this.getMyClientIds(userId).then((ids) => ids.length),
        this.prisma.project.count({
          where: { createdBy: userId, status: 'active' },
        }),
        this.prisma.project.count({
          where: { createdBy: userId, status: 'completed' },
        }),
        this.getMyProjectIds(userId),
      ]);

    const candidatesFilled = await countFilledCandidatesForProjects(
      this.prisma,
      projectIds,
    );

    return {
      success: true,
      data: {
        myClients,
        activeProjects,
        completedProjects,
        candidatesFilled,
      },
      message: 'Project coordinator dashboard stats retrieved successfully',
    };
  }

  async getProjectsByStatus(userId: string) {
    const [active, completed, cancelled] = await Promise.all([
      this.prisma.project.count({
        where: { createdBy: userId, status: 'active' },
      }),
      this.prisma.project.count({
        where: { createdBy: userId, status: 'completed' },
      }),
      this.prisma.project.count({
        where: { createdBy: userId, status: 'cancelled' },
      }),
    ]);

    return {
      success: true,
      data: { active, completed, cancelled },
      message: 'Project status breakdown retrieved successfully',
    };
  }

  async getClientsOverview(userId: string) {
    const clientIds = await this.getMyClientIds(userId);
    if (clientIds.length === 0) {
      return {
        success: true,
        data: [],
        message: 'Clients overview retrieved successfully',
      };
    }

    const clients = await this.prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: {
        id: true,
        name: true,
        projects: {
          where: { createdBy: userId },
          select: { status: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const data = clients
      .map((client) => {
        const activeProjects = client.projects.filter(
          (project) => project.status === 'active',
        ).length;
        const completedProjects = client.projects.filter(
          (project) => project.status === 'completed',
        ).length;

        return {
          clientId: client.id,
          clientName: client.name,
          projectCount: client.projects.length,
          activeProjects,
          completedProjects,
        };
      })
      .filter((client) => client.projectCount > 0 || clientIds.includes(client.clientId))
      .sort((a, b) => b.projectCount - a.projectCount);

    return {
      success: true,
      data,
      message: 'Clients overview retrieved successfully',
    };
  }

  async getClientProjects(userId: string, query?: ClientProjectsQueryDto) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = { createdBy: userId };

    const [total, projects] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          rolesNeeded: {
            select: {
              id: true,
              designation: true,
              quantity: true,
            },
          },
        },
      }),
    ]);

    const projectRoles = await buildProjectRoleHiringRows(this.prisma, projects);

    const roleMap = new Map(
      projectRoles.map((entry) => [entry.projectId, entry.roles]),
    );

    const rows = projects.map((project) => ({
      clientId: project.client?.id ?? '',
      clientName: project.client?.name ?? 'Unassigned client',
      projectId: project.id,
      projectName: project.title,
      status: project.status as 'active' | 'completed' | 'cancelled',
      roles: (roleMap.get(project.id) ?? []).map((role) => ({
        name: role.role,
        filled: role.filled,
        target: role.required,
      })),
    }));

    return {
      success: true,
      data: {
        rows,
        pagination: {
          total,
          totalPages: Math.ceil(total / limit),
          page,
          limit,
        },
      },
      message: 'Client projects retrieved successfully',
    };
  }

  async getProjectRoleHiringStatus(
    userId: string,
    query?: ProjectRoleHiringStatusQueryDto,
  ) {
    const { projectId, search, page = 1, limit = 10 } = query ?? {};
    const skip = (page - 1) * limit;

    const projectWhere: Prisma.ProjectWhereInput = {
      createdBy: userId,
      status: 'active',
    };

    if (projectId) {
      projectWhere.id = projectId;
    }

    if (search) {
      projectWhere.title = { contains: search, mode: 'insensitive' };
    }

    const [total, projects] = await Promise.all([
      this.prisma.project.count({ where: projectWhere }),
      this.prisma.project.findMany({
        where: projectWhere,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          rolesNeeded: {
            select: {
              id: true,
              designation: true,
              quantity: true,
            },
          },
        },
      }),
    ]);

    const projectRoles = await buildProjectRoleHiringRows(this.prisma, projects);

    return {
      success: true,
      data: {
        projectRoles,
        pagination: {
          total,
          totalPages: Math.ceil(total / limit),
          page,
          limit,
        },
      },
      message: 'Project role hiring status retrieved successfully',
    };
  }
}
