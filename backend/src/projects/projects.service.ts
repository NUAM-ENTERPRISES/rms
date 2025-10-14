import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CountriesService } from '../countries/countries.service';
import { QualificationsService } from '../qualifications/qualifications.service';
import {
  CreateProjectDto,
  CreateRoleNeededDto,
} from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { AssignCandidateDto } from './dto/assign-candidate.dto';
import { ProjectWithRelations, PaginatedProjects, ProjectStats } from './types';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly countriesService: CountriesService,
    private readonly qualificationsService: QualificationsService,
  ) {}

  async create(
    createProjectDto: CreateProjectDto,
    userId: string,
  ): Promise<ProjectWithRelations> {
    // Validate client exists if provided
    if (createProjectDto.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: createProjectDto.clientId },
      });
      if (!client) {
        throw new NotFoundException(
          `Client with ID ${createProjectDto.clientId} not found`,
        );
      }
    }

    // Validate team exists if provided
    if (createProjectDto.teamId) {
      const team = await this.prisma.team.findUnique({
        where: { id: createProjectDto.teamId },
      });
      if (!team) {
        throw new NotFoundException(
          `Team with ID ${createProjectDto.teamId} not found`,
        );
      }
    }

    // Validate deadline is in the future if provided
    if (createProjectDto.deadline) {
      const deadline = new Date(createProjectDto.deadline);
      if (deadline <= new Date()) {
        throw new BadRequestException('Project deadline must be in the future');
      }
    }

    // Validate country code if provided
    if (createProjectDto.countryCode) {
      const isValidCountry = await this.countriesService.validateCountryCode(
        createProjectDto.countryCode,
      );
      if (!isValidCountry) {
        throw new BadRequestException(
          `Invalid or inactive country code: ${createProjectDto.countryCode}`,
        );
      }
    }

    // Validate education requirements for all roles
    if (createProjectDto.rolesNeeded) {
      for (const role of createProjectDto.rolesNeeded) {
        if (
          role.educationRequirementsList &&
          role.educationRequirementsList.length > 0
        ) {
          const qualificationIds = role.educationRequirementsList.map(
            (req) => req.qualificationId,
          );
          const areValidQualifications =
            await this.qualificationsService.validateQualificationIds(
              qualificationIds,
            );
          if (!areValidQualifications) {
            throw new BadRequestException(
              `One or more qualification IDs are invalid or inactive for role: ${role.designation}`,
            );
          }
        }
      }
    }

    // Create project with roles needed using transaction
    const project = await this.prisma.$transaction(async (tx) => {
      // Create the project first
      const createdProject = await tx.project.create({
        data: {
          clientId: createProjectDto.clientId,
          title: createProjectDto.title,
          description: createProjectDto.description,
          deadline: createProjectDto.deadline
            ? new Date(createProjectDto.deadline)
            : null,
          status: createProjectDto.status || 'active',
          priority: createProjectDto.priority || 'medium',
          createdBy: userId,
          teamId: createProjectDto.teamId,
          countryCode: createProjectDto.countryCode?.toUpperCase(),
        },
      });

      // Create roles needed if provided
      if (
        createProjectDto.rolesNeeded &&
        createProjectDto.rolesNeeded.length > 0
      ) {
        for (const role of createProjectDto.rolesNeeded) {
          const createdRole = await tx.roleNeeded.create({
            data: {
              projectId: createdProject.id,
              designation: role.designation,
              quantity: role.quantity,
              priority: role.priority || 'medium',
              minExperience: role.minExperience,
              maxExperience: role.maxExperience,
              specificExperience: role.specificExperience
                ? JSON.parse(role.specificExperience)
                : null,
              requiredCertifications: role.requiredCertifications
                ? JSON.parse(role.requiredCertifications)
                : null,
              institutionRequirements: role.institutionRequirements,
              skills: role.skills ? JSON.parse(role.skills) : [],
              technicalSkills: role.technicalSkills
                ? JSON.parse(role.technicalSkills)
                : null,
              languageRequirements: role.languageRequirements
                ? JSON.parse(role.languageRequirements)
                : null,
              licenseRequirements: role.licenseRequirements
                ? JSON.parse(role.licenseRequirements)
                : null,
              backgroundCheckRequired: role.backgroundCheckRequired ?? true,
              drugScreeningRequired: role.drugScreeningRequired ?? true,
              shiftType: role.shiftType,
              onCallRequired: role.onCallRequired ?? false,
              physicalDemands: role.physicalDemands,
              salaryRange: role.salaryRange
                ? JSON.parse(role.salaryRange)
                : null,
              benefits: role.benefits,
              relocationAssistance: role.relocationAssistance ?? false,
              additionalRequirements: role.additionalRequirements,
              notes: role.notes,
            },
          });

          // Create normalized education requirements if provided
          if (
            role.educationRequirementsList &&
            role.educationRequirementsList.length > 0
          ) {
            await tx.roleNeededEducationRequirement.createMany({
              data: role.educationRequirementsList.map((req) => ({
                roleNeededId: createdRole.id,
                qualificationId: req.qualificationId,
                mandatory: req.mandatory,
              })),
            });
          }
        }
      }

      return createdProject;
    });

    // Fetch the complete project with all relations
    const completeProject = await this.prisma.project.findUnique({
      where: { id: project.id },
      include: {
        client: true,
        creator: true,
        team: true,
        rolesNeeded: {
          include: {
            educationRequirementsList: {
              include: {
                qualification: {
                  select: {
                    id: true,
                    name: true,
                    shortName: true,
                    level: true,
                    field: true,
                  },
                },
              },
            },
          },
        },
        candidateProjects: {
          include: {
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                countryCode: true,
                mobileNumber: true,
                email: true,
                currentStatus: true,
              },
            },
          },
        },
      },
    });

    if (!completeProject) {
      throw new Error('Failed to create project');
    }

    return completeProject;
  }

  async findAll(query: QueryProjectsDto): Promise<PaginatedProjects> {
    const {
      search,
      status,
      clientId,
      teamId,
      createdBy,
      deadlineFrom,
      deadlineTo,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (teamId) {
      where.teamId = teamId;
    }

    if (createdBy) {
      where.createdBy = createdBy;
    }

    if (deadlineFrom || deadlineTo) {
      where.deadline = {};
      if (deadlineFrom) {
        where.deadline.gte = new Date(deadlineFrom);
      }
      if (deadlineTo) {
        where.deadline.lte = new Date(deadlineTo);
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const total = await this.prisma.project.count({ where });

    // Get projects with relations
    const projects = await this.prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        client: true,
        creator: true,
        team: true,
        rolesNeeded: true,
        candidateProjects: {
          include: {
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                countryCode: true,
                mobileNumber: true,
                email: true,
                currentStatus: true,
              },
            },
          },
        },
      },
    });

    return {
      projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<ProjectWithRelations> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        creator: true,
        team: true,
        rolesNeeded: {
          include: {
            educationRequirementsList: {
              include: {
                qualification: {
                  select: {
                    id: true,
                    name: true,
                    shortName: true,
                    level: true,
                    field: true,
                  },
                },
              },
            },
          },
        },
        candidateProjects: {
          include: {
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                countryCode: true,
                mobileNumber: true,
                email: true,
                currentStatus: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    userId: string,
  ): Promise<ProjectWithRelations> {
    // Check if project exists
    const existingProject = await this.prisma.project.findUnique({
      where: { id },
    });
    if (!existingProject) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    // Validate client exists if updating
    if (updateProjectDto.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: updateProjectDto.clientId },
      });
      if (!client) {
        throw new NotFoundException(
          `Client with ID ${updateProjectDto.clientId} not found`,
        );
      }
    }

    // Validate team exists if updating
    if (updateProjectDto.teamId) {
      const team = await this.prisma.team.findUnique({
        where: { id: updateProjectDto.teamId },
      });
      if (!team) {
        throw new NotFoundException(
          `Team with ID ${updateProjectDto.teamId} not found`,
        );
      }
    }

    // Note: No deadline validation for updates - existing projects can have past deadlines

    // Validate country code if updating
    if (updateProjectDto.countryCode) {
      const isValidCountry = await this.countriesService.validateCountryCode(
        updateProjectDto.countryCode,
      );
      if (!isValidCountry) {
        throw new BadRequestException(
          `Invalid or inactive country code: ${updateProjectDto.countryCode}`,
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (updateProjectDto.title) updateData.title = updateProjectDto.title;
    if (updateProjectDto.description !== undefined)
      updateData.description = updateProjectDto.description;
    if (updateProjectDto.deadline)
      updateData.deadline = new Date(updateProjectDto.deadline);
    if (updateProjectDto.status) updateData.status = updateProjectDto.status;
    if (updateProjectDto.priority)
      updateData.priority = updateProjectDto.priority;
    if (updateProjectDto.clientId)
      updateData.clientId = updateProjectDto.clientId;
    if (updateProjectDto.teamId !== undefined)
      updateData.teamId = updateProjectDto.teamId;
    if (updateProjectDto.countryCode !== undefined)
      updateData.countryCode = updateProjectDto.countryCode?.toUpperCase();

    // Handle rolesNeeded updates if provided
    if (updateProjectDto.rolesNeeded !== undefined) {
      // Delete existing roles needed
      await this.prisma.roleNeeded.deleteMany({
        where: { projectId: id },
      });

      // Create new roles needed
      if (updateProjectDto.rolesNeeded.length > 0) {
        for (const role of updateProjectDto.rolesNeeded) {
          const createdRole = await this.prisma.roleNeeded.create({
            data: {
              projectId: id,
              designation: role.designation,
              quantity: role.quantity,
              priority: role.priority || 'medium',
              minExperience: role.minExperience,
              maxExperience: role.maxExperience,
              specificExperience: role.specificExperience
                ? JSON.parse(role.specificExperience)
                : null,
              requiredCertifications: role.requiredCertifications
                ? JSON.parse(role.requiredCertifications)
                : null,
              institutionRequirements: role.institutionRequirements,
              skills: role.skills ? JSON.parse(role.skills) : [],
              technicalSkills: role.technicalSkills
                ? JSON.parse(role.technicalSkills)
                : null,
              languageRequirements: role.languageRequirements
                ? JSON.parse(role.languageRequirements)
                : null,
              licenseRequirements: role.licenseRequirements
                ? JSON.parse(role.licenseRequirements)
                : null,
              backgroundCheckRequired: role.backgroundCheckRequired ?? true,
              drugScreeningRequired: role.drugScreeningRequired ?? true,
              shiftType: role.shiftType,
              onCallRequired: role.onCallRequired ?? false,
              physicalDemands: role.physicalDemands,
              salaryRange: role.salaryRange
                ? JSON.parse(role.salaryRange)
                : null,
              benefits: role.benefits,
              relocationAssistance: role.relocationAssistance ?? false,
              additionalRequirements: role.additionalRequirements,
              notes: role.notes,
            },
          });

          // Create normalized education requirements if provided
          if (
            role.educationRequirementsList &&
            role.educationRequirementsList.length > 0
          ) {
            await this.prisma.roleNeededEducationRequirement.createMany({
              data: role.educationRequirementsList.map((req) => ({
                roleNeededId: createdRole.id,
                qualificationId: req.qualificationId,
                mandatory: req.mandatory,
              })),
            });
          }
        }
      }
    }

    // Update project
    const project = await this.prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
        creator: true,
        team: true,
        rolesNeeded: {
          include: {
            educationRequirementsList: {
              include: {
                qualification: {
                  select: {
                    id: true,
                    name: true,
                    shortName: true,
                    level: true,
                    field: true,
                  },
                },
              },
            },
          },
        },
        candidateProjects: {
          include: {
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                countryCode: true,
                mobileNumber: true,
                email: true,
                currentStatus: true,
              },
            },
          },
        },
      },
    });

    return project;
  }

  async remove(
    id: string,
    userId: string,
  ): Promise<{ id: string; message: string }> {
    // Check if project exists
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        candidateProjects: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    // Check if project has assigned candidates
    if (project.candidateProjects.length > 0) {
      throw new ConflictException(
        `Cannot delete project with ID ${id} because it has assigned candidates. Please remove all candidate assignments first.`,
      );
    }

    // Delete project (roles needed will be deleted via cascade)
    await this.prisma.project.delete({
      where: { id },
    });

    return {
      id,
      message: 'Project deleted successfully',
    };
  }

  async assignCandidate(
    projectId: string,
    assignCandidateDto: AssignCandidateDto,
    userId: string,
  ): Promise<{ message: string; assignment: any }> {
    // Check if project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Check if candidate exists
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: assignCandidateDto.candidateId },
    });
    if (!candidate) {
      throw new NotFoundException(
        `Candidate with ID ${assignCandidateDto.candidateId} not found`,
      );
    }

    // Check if assignment already exists
    const existingAssignment = await this.prisma.candidateProjectMap.findFirst({
      where: {
        candidateId: assignCandidateDto.candidateId,
        projectId,
      },
    });

    if (existingAssignment) {
      throw new ConflictException(
        `Candidate ${assignCandidateDto.candidateId} is already assigned to project ${projectId}`,
      );
    }

    // Create assignment (nomination)
    const assignment = await this.prisma.candidateProjectMap.create({
      data: {
        candidateId: assignCandidateDto.candidateId,
        projectId,
        nominatedBy: assignCandidateDto.notes || '', // TODO: Get from request user
        notes: assignCandidateDto.notes,
        status: 'nominated', // Initial status
      },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            countryCode: true,
            mobileNumber: true,
            email: true,
            currentStatus: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    return {
      message: 'Candidate assigned to project successfully',
      assignment,
    };
  }

  async getProjectCandidates(projectId: string): Promise<any[]> {
    // Check if project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Get all candidates assigned to the project
    const assignments = await this.prisma.candidateProjectMap.findMany({
      where: { projectId },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            countryCode: true,
            mobileNumber: true,
            email: true,
            currentStatus: true,
            experience: true,
            skills: true,
            expectedSalary: true,
            assignedTo: true,
          },
        },
      },
      orderBy: { nominatedDate: 'desc' },
    });

    return assignments;
  }

  async getProjectStats(): Promise<ProjectStats> {
    // Get total counts
    const [
      totalProjects,
      activeProjects,
      completedProjects,
      cancelledProjects,
    ] = await Promise.all([
      this.prisma.project.count(),
      this.prisma.project.count({ where: { status: 'active' } }),
      this.prisma.project.count({ where: { status: 'completed' } }),
      this.prisma.project.count({ where: { status: 'cancelled' } }),
    ]);

    // Get projects by status
    const projectsByStatus = {
      active: activeProjects,
      completed: completedProjects,
      cancelled: cancelledProjects,
    };

    // Get projects by client with client names
    const projectsByClientData = await this.prisma.project.groupBy({
      by: ['clientId'],
      _count: { clientId: true },
    });

    // Get client details for the projects
    const clientIds = projectsByClientData
      .map((item) => item.clientId)
      .filter((id): id is string => id !== null);
    const clients = await this.prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, name: true },
    });

    const clientMap = clients.reduce(
      (acc, client) => {
        acc[client.id] = client.name;
        return acc;
      },
      {} as { [clientId: string]: string },
    );

    const projectsByClient = projectsByClientData.reduce(
      (acc, item) => {
        if (item.clientId) {
          acc[item.clientId] = {
            count: item._count.clientId,
            name: clientMap[item.clientId] || `Client ${item.clientId}`,
          };
        }
        return acc;
      },
      {} as { [clientId: string]: { count: number; name: string } },
    );

    // Get upcoming deadlines (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const upcomingDeadlines = await this.prisma.project.findMany({
      where: {
        deadline: {
          gte: new Date(),
          lte: thirtyDaysFromNow,
        },
        status: 'active',
      },
      include: {
        client: true,
        creator: true,
        team: true,
        rolesNeeded: true,
        candidateProjects: {
          include: {
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                countryCode: true,
                mobileNumber: true,
                email: true,
                currentStatus: true,
              },
            },
          },
        },
      },
      orderBy: { deadline: 'asc' },
      take: 10,
    });

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      cancelledProjects,
      projectsByStatus,
      projectsByClient,
      upcomingDeadlines,
    };
  }

  /**
   * Get eligible candidates for a project
   * Returns candidates who match project requirements and are not yet nominated
   */
  async getEligibleCandidates(projectId: string): Promise<any[]> {
    // Get project with requirements
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        rolesNeeded: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Get candidates not already nominated for this project
    const candidates = await this.prisma.candidate.findMany({
      where: {
        projects: {
          none: {
            projectId,
          },
        },
      },
      include: {
        recruiter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Implement advanced matching logic based on project requirements
    const matchedCandidates = candidates.filter((candidate) => {
      // Check if candidate matches any role requirements
      return project.rolesNeeded.some((role) => {
        // Experience matching
        const experienceMatch = this.matchExperience(
          candidate.experience,
          role.minExperience,
          role.maxExperience,
        );

        // Skills matching (if skills are stored as arrays)
        const skillsMatch = this.matchSkills(
          candidate.skills as string[],
          role.skills as string,
        );

        // Basic matching - for now, return true if experience matches
        // TODO: Add more sophisticated matching logic for education, certifications, etc.
        return experienceMatch && skillsMatch;
      });
    });

    // Add match score to each candidate
    return matchedCandidates.map((candidate) => ({
      ...candidate,
      matchScore: this.calculateMatchScore(candidate, project.rolesNeeded),
    }));
  }

  /**
   * Match candidate experience against role requirements
   */
  private matchExperience(
    candidateExperience: number | null | undefined,
    minExperience: number | null | undefined,
    maxExperience: number | null | undefined,
  ): boolean {
    if (!candidateExperience) return false;
    if (!minExperience && !maxExperience) return true;

    if (minExperience && candidateExperience < minExperience) return false;
    if (maxExperience && candidateExperience > maxExperience) return false;

    return true;
  }

  /**
   * Match candidate skills against role requirements
   */
  private matchSkills(
    candidateSkills: string[] | null | undefined,
    roleSkills: string | null | undefined,
  ): boolean {
    if (!roleSkills) return true; // No skill requirements
    if (!candidateSkills || candidateSkills.length === 0) return false;

    try {
      const requiredSkills = JSON.parse(roleSkills) as string[];
      if (!Array.isArray(requiredSkills)) return true;

      // Check if candidate has at least one required skill
      return requiredSkills.some((skill) =>
        candidateSkills.some((candidateSkill) =>
          candidateSkill.toLowerCase().includes(skill.toLowerCase()),
        ),
      );
    } catch {
      // If parsing fails, do simple string matching
      return candidateSkills.some((skill) =>
        skill.toLowerCase().includes(roleSkills.toLowerCase()),
      );
    }
  }

  /**
   * Calculate match score for a candidate
   */
  private calculateMatchScore(candidate: any, rolesNeeded: any[]): number {
    let totalScore = 0;
    let maxScore = 0;

    rolesNeeded.forEach((role) => {
      maxScore += 100; // Max score per role
      let roleScore = 0;

      // Experience scoring (40 points)
      if (
        candidate.experience &&
        this.matchExperience(
          candidate.experience,
          role.minExperience,
          role.maxExperience,
        )
      ) {
        roleScore += 40;
      }

      // Skills scoring (30 points)
      if (this.matchSkills(candidate.skills, role.skills)) {
        roleScore += 30;
      }

      // Basic qualification (30 points) - always give some points for being in the system
      roleScore += 30;

      totalScore += roleScore;
    });

    return Math.round((totalScore / maxScore) * 100);
  }
}
