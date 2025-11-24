import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { RoundRobinService } from '../round-robin/round-robin.service';
import { CandidateAllocationService } from '../candidate-allocation/candidate-allocation.service';
import { CandidateMatchingService } from '../candidate-matching/candidate-matching.service';
import { RecruiterPoolService } from '../recruiter-pool/recruiter-pool.service';
import { OutboxService } from '../notifications/outbox.service';
import { UnifiedEligibilityService } from '../candidate-eligibility/unified-eligibility.service';
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

  // Helper method to safely parse JSON fields
  private parseJsonField(field: any): any[] {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.warn('Failed to parse JSON field:', field, error);
        return [];
      }
    }
    return [];
  }

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
          // New project-level fields
          projectType: createProjectDto.projectType || 'private',
          resumeEditable: createProjectDto.resumeEditable ?? true,
          groomingRequired: createProjectDto.groomingRequired || 'formal',
          hideContactInfo: createProjectDto.hideContactInfo ?? true,
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
              // New fields
              employmentType: role.employmentType || 'permanent',
              contractDurationYears: role.contractDurationYears,
              genderRequirement: role.genderRequirement || 'all',
              visaType: role.visaType || 'contract',
              requiredSkills: role.requiredSkills
                ? JSON.parse(role.requiredSkills)
                : [],
              candidateStates: role.candidateStates
                ? JSON.parse(role.candidateStates)
                : [],
              candidateReligions: role.candidateReligions
                ? JSON.parse(role.candidateReligions)
                : [],
              minHeight: role.minHeight,
              maxHeight: role.maxHeight,
              minWeight: role.minWeight,
              maxWeight: role.maxWeight,
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

      // Create document requirements if provided
      if (
        createProjectDto.documentRequirements &&
        createProjectDto.documentRequirements.length > 0
      ) {
        await tx.documentRequirement.createMany({
          data: createProjectDto.documentRequirements.map((req) => ({
            projectId: createdProject.id,
            docType: req.docType,
            mandatory: req.mandatory,
            description: req.description,
          })),
        });
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
                currentStatus: {
                  select: {
                    statusName: true,
                  },
                },
              },
            },
          },
        },
        documentRequirements: true,
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

    // Parse JSON fields in rolesNeeded for all projects
    const projectsWithParsedData = projects.map((project) => ({
      ...project,
      rolesNeeded: project.rolesNeeded.map((role) => ({
        ...role,
        requiredSkills: this.parseJsonField(role.requiredSkills),
        candidateStates: this.parseJsonField(role.candidateStates),
        candidateReligions: this.parseJsonField(role.candidateReligions),
        skills: this.parseJsonField(role.skills),
        languageRequirements: this.parseJsonField(role.languageRequirements),
        licenseRequirements: this.parseJsonField(role.licenseRequirements),
        requiredCertifications: this.parseJsonField(
          role.requiredCertifications,
        ),
        specificExperience: this.parseJsonField(role.specificExperience),
        salaryRange: this.parseJsonField(role.salaryRange),
        educationRequirements: this.parseJsonField(role.educationRequirements),
        technicalSkills: this.parseJsonField(role.technicalSkills),
      })),
    }));

    return {
      projects: projectsWithParsedData,
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
        documentRequirements: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    // Parse JSON fields in rolesNeeded
    const projectWithParsedData = {
      ...project,
      rolesNeeded: project.rolesNeeded.map((role) => ({
        ...role,
        requiredSkills: this.parseJsonField(role.requiredSkills),
        candidateStates: this.parseJsonField(role.candidateStates),
        candidateReligions: this.parseJsonField(role.candidateReligions),
        skills: this.parseJsonField(role.skills),
        languageRequirements: this.parseJsonField(role.languageRequirements),
        licenseRequirements: this.parseJsonField(role.licenseRequirements),
        requiredCertifications: this.parseJsonField(
          role.requiredCertifications,
        ),
        specificExperience: this.parseJsonField(role.specificExperience),
        salaryRange: this.parseJsonField(role.salaryRange),
        educationRequirements: this.parseJsonField(role.educationRequirements),
        technicalSkills: this.parseJsonField(role.technicalSkills),
      })),
    };

    return projectWithParsedData;
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
    // New project-level fields
    if (updateProjectDto.projectType !== undefined)
      updateData.projectType = updateProjectDto.projectType;
    if (updateProjectDto.resumeEditable !== undefined)
      updateData.resumeEditable = updateProjectDto.resumeEditable;
    if (updateProjectDto.groomingRequired !== undefined)
      updateData.groomingRequired = updateProjectDto.groomingRequired;
    if (updateProjectDto.hideContactInfo !== undefined)
      updateData.hideContactInfo = updateProjectDto.hideContactInfo;

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
              // New fields
              employmentType: role.employmentType || 'permanent',
              contractDurationYears: role.contractDurationYears,
              genderRequirement: role.genderRequirement || 'all',
              visaType: role.visaType || 'contract',
              requiredSkills: role.requiredSkills
                ? JSON.parse(role.requiredSkills)
                : [],
              candidateStates: role.candidateStates
                ? JSON.parse(role.candidateStates)
                : [],
              candidateReligions: role.candidateReligions
                ? JSON.parse(role.candidateReligions)
                : [],
              minHeight: role.minHeight,
              maxHeight: role.maxHeight,
              minWeight: role.minWeight,
              maxWeight: role.maxWeight,
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
    const existingAssignment = await this.prisma.candidateProjects.findFirst({
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

    // Get all global recruiters for round-robin allocation
    const recruiters = await this.getAllRecruiters();
    if (recruiters.length === 0) {
      throw new BadRequestException('No recruiters available in the system');
    }

    // Use round-robin to get next recruiter
    const roundRobinService = new RoundRobinService(this.prisma);
    const recruiter = await roundRobinService.getNextRecruiter(
      projectId,
      '', // No specific role needed for manual assignment
      recruiters,
    );

    // Create assignment (nomination) with recruiter assignment
    const assignment = await this.prisma.candidateProjects.create({
      data: {
        candidateId: assignCandidateDto.candidateId,
        projectId,
        notes: assignCandidateDto.notes,
        currentProjectStatusId: 1, // Nominated status
        recruiterId: recruiter.id,
        assignedAt: new Date(),
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

  /**
   * Get nominated candidates for a project with match scoring, search, and pagination
   * Nominated = candidates in candidate_projects table for this project (any status)
   * Recruiters see only their nominated candidates, other roles see all
   */
async getNominatedCandidates(
  projectId: string,
  userId: string,
  userRoles: string[],
  query: {
    search?: string;
    /** legacy/id-based status filter (cuid) -- kept for backward compatibility */
    statusId?: string;
    /** legacy/id-based sub-status filter (cuid) -- kept for backward compatibility */
    subStatusId?: string;
    /** preferred: status name to match against mainStatus.name OR subStatus.name */
    status?: string;
    /** preferred: sub-status name to match against subStatus.name */
    subStatus?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  },
) {
  // ---------------------------------------------
  // 1. Validate project
  // ---------------------------------------------
  const project = await this.prisma.project.findUnique({
    where: { id: projectId },
    include: {
      rolesNeeded: {
        include: {
          educationRequirementsList: {
            include: { qualification: true },
          },
        },
      },
    },
  });

  if (!project) {
    throw new NotFoundException(`Project with ID ${projectId} not found`);
  }

  const {
    search,
    statusId,
    subStatusId,
    status,
    subStatus,
    page = 1,
    limit = 10,
    sortBy = 'matchScore',
    sortOrder = 'desc',
  } = query;

  // ---------------------------------------------
  // 2. Build WHERE clause
  // ---------------------------------------------
  const whereClause: any = { projectId };

  // Sub-status name has highest precedence (preferred), then subStatusId.
  if (subStatus) {
    // Match by relation name (Prisma): subStatus.name
    whereClause.subStatus = { name: subStatus };
  } else if (subStatusId) {
    whereClause.subStatusId = subStatusId;
  }

  // Status (name) can match either mainStatus.name OR subStatus.name.
  // If provided, we add an AND condition requiring one of them to match.
  if (status) {
    whereClause.AND = whereClause.AND || [];
    whereClause.AND.push({ OR: [{ mainStatus: { name: status } }, { subStatus: { name: status } }] });
  } else if (statusId) {
    // Backwards compatible: statusId matches either mainStatusId OR subStatusId
    whereClause.AND = whereClause.AND || [];
    whereClause.AND.push({ OR: [{ mainStatusId: statusId }, { subStatusId: statusId }] });
  }

  const isRecruiter =
    userRoles.includes('Recruiter') &&
    !userRoles.includes('Manager') &&
    !userRoles.includes('CEO') &&
    !userRoles.includes('Director');

  if (isRecruiter) {
    whereClause.recruiterId = userId;
  }

  // 🔍 Search filter
  if (search) {
    whereClause.candidate = {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { mobileNumber: { contains: search } },
      ],
    };
  }

  // ---------------------------------------------
  // 3. Pagination Count
  // ---------------------------------------------
  const total = await this.prisma.candidateProjects.count({
    where: whereClause,
  });

  // ---------------------------------------------
  // 4. Fetch Assignments (WITH MAIN & SUB STATUS)
  // ---------------------------------------------
  const assignments = await this.prisma.candidateProjects.findMany({
    where: whereClause,
    skip: (page - 1) * limit,
    take: limit,
    include: {
      candidate: {
        include: {
          team: true,
          qualifications: {
            include: {
              qualification: true,
            },
          },
          currentStatus: {
            select: {
              id: true,
              statusName: true,
            },
          },
          recruiterAssignments: {
            where: { isActive: true },
            include: {
              recruiter: { select: { id: true, name: true, email: true } },
            },
            take: 1,
            orderBy: { assignedAt: 'desc' },
          },
        },
      },

      // New Status System
      mainStatus: {
        select: {
          id: true,
          name: true,
          label: true,
          color: true,
          icon: true,
          order: true,
        },
      },
      subStatus: {
        select: {
          id: true,
          name: true,
          label: true,
          color: true,
          icon: true,
          order: true,
        },
      },

      project: {
        include: {
          rolesNeeded: {
            include: {
              educationRequirementsList: {
                include: { qualification: true },
              },
            },
          },
        },
      },

      recruiter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // ---------------------------------------------
  // 5. Map Output EXACTLY like eligible-candidates
  // ---------------------------------------------
  const candidatesWithScore = assignments.map((assignment) => {
    const c = assignment.candidate;

    const matchScore = this.calculateMatchScore(
      c,
      project.rolesNeeded,
    );

    return {
      // Candidate Fields (Same as Eligible)
      id: assignment.id,
      candidateId: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      countryCode: c.countryCode,
      mobileNumber: c.mobileNumber,
      experience: c.totalExperience ?? c.experience,
      skills: this.parseJsonField(c.skills),
      expectedSalary: c.expectedSalary,

      // Team
      team: c.team ? { id: c.team.id, name: c.team.name } : null,

      // Current Global Candidate Status
      currentStatus: c.currentStatus,

      // Recruiter Assignments (same as Eligible)
      recruiterAssignments: c.recruiterAssignments,

      // New Project-level Status
      projectMainStatus: assignment.mainStatus,
      projectSubStatus: assignment.subStatus,

      // Qualifications
      qualifications: c.qualifications.map((q) => ({
        id: q.qualification.id,
        name: q.qualification.name,
        level: q.qualification.level,
        field: q.qualification.field,
      })),

      // Recruiter who nominated
      recruiter: assignment.recruiter,

      // Project info (include rolesNeeded summary)
      project: assignment.project
        ? {
            id: assignment.project.id,
            title: assignment.project.title,
            status: assignment.project.status,
            rolesNeeded: assignment.project.rolesNeeded
              ? assignment.project.rolesNeeded.map((r) => ({
                  id: r.id,
                  designation: r.designation,
                  quantity: r.quantity,
                  skills: this.parseJsonField(r.skills),
                }))
              : [],
          }
        : null,

      // Metadata
      nominatedAt: assignment.createdAt,
      assignedAt: assignment.assignedAt,
      notes: assignment.notes,

      // Match Score
      matchScore,
    };
  });

  // ---------------------------------------------
  // 6. Sorting
  // ---------------------------------------------
  let sorted = [...candidatesWithScore];

  if (sortBy === 'matchScore') {
    sorted.sort((a, b) =>
      sortOrder === 'desc' ? b.matchScore - a.matchScore : a.matchScore - b.matchScore,
    );
  } else if (sortBy === 'experience') {
    sorted.sort((a, b) =>
      sortOrder === 'desc'
        ? (b.experience || 0) - (a.experience || 0)
        : (a.experience || 0) - (b.experience || 0),
    );
  } else if (sortBy === 'firstName') {
    sorted.sort((a, b) =>
      sortOrder === 'desc'
        ? b.firstName.localeCompare(a.firstName)
        : a.firstName.localeCompare(b.firstName),
    );
  } else if (sortBy === 'createdAt') {
    sorted.sort((a, b) => {
      const dateA = new Date(a.nominatedAt).getTime();
      const dateB = new Date(b.nominatedAt).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }

  // ---------------------------------------------
  // 7. Final Return
  // ---------------------------------------------
  return {
    candidates: sorted,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
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
    const assignments = await this.prisma.candidateProjects.findMany({
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
            // assignedTo field removed - recruiter info now in CandidateProjectMap
          },
        },
      },
      orderBy: { createdAt: 'desc' },
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
async getEligibleCandidates(
  projectId: string,
  userId: string,
  userRoles: string[],
): Promise<any[]> {
  // --------------------------------
  // 1. GET PROJECT WITH REQUIREMENTS
  // --------------------------------
  const project = await this.prisma.project.findUnique({
    where: { id: projectId },
    include: {
      rolesNeeded: true,
    },
  });

  if (!project) {
    throw new NotFoundException(`Project with ID ${projectId} not found`);
  }

  // --------------------------------
  // 2. BUILD WHERE CLAUSE
  // --------------------------------
  const whereClause: any = {
    projects: {
      none: {
        projectId,
      },
    },
  };

  // Recruiter specific filter
  const isRecruiter =
    userRoles.includes('Recruiter') &&
    !userRoles.includes('Manager') &&
    !userRoles.includes('CEO') &&
    !userRoles.includes('Director');

  if (isRecruiter) {
    whereClause.recruiterAssignments = {
      some: {
        recruiterId: userId,
        isActive: true,
      },
    };
  }

  // --------------------------------
  // 3. GET CANDIDATES
  // --------------------------------
  const candidates = await this.prisma.candidate.findMany({
    where: whereClause,
    include: {
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      qualifications: {
        include: {
          qualification: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
        },
      },

      // ----------------------------
      // 🔥 NEW PROJECT-STATUS INCLUDE
      // ----------------------------
      projects: {
        where: { projectId },
        select: {
          id: true,
          assignedAt: true,

          // MAIN STATUS (big stage)
          mainStatus: {
            select: {
              id: true,
              name: true,
              label: true,
              color: true,
              icon: true,
              order: true,
            },
          },

          // SUB STATUS (progress inside stage)
          subStatus: {
            select: {
              id: true,
              name: true,
              label: true,
              color: true,
              icon: true,
              order: true,
            },
          },
        },
        // NO extra include inside projects
        take: 1,
        orderBy: { assignedAt: 'desc' },
      },

      currentStatus: {
        select: {
          id: true,
          statusName: true,
        },
      },

      recruiterAssignments: {
        where: { isActive: true },
        include: {
          recruiter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        take: 1,
        orderBy: { assignedAt: 'desc' },
      },
    },
  });

  // --------------------------------
  // 4. FILTER MATCHING CANDIDATES
  // --------------------------------
  const matchedCandidates = candidates.filter((candidate) => {
    return project.rolesNeeded.some((role) => {
      const candidateExperience =
        candidate.totalExperience ?? candidate.experience;

      const experienceMatch = this.matchExperience(
        candidateExperience,
        role.minExperience,
        role.maxExperience,
      );

      const skillsMatch = this.matchSkills(
        candidate.skills as string[],
        role.skills as string,
      );

      return experienceMatch && skillsMatch;
    });
  });

  // --------------------------------
  // 5. RETURN MATCH SCORE
  // --------------------------------
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
    roleSkills: string | any[] | null | undefined,
  ): boolean {
    // No skill requirements - always match
    if (!roleSkills) return true;

    // Handle case where roleSkills is already an array (from Prisma JSON field)
    let requiredSkills: string[] = [];
    
    if (Array.isArray(roleSkills)) {
      requiredSkills = roleSkills;
    } else if (typeof roleSkills === 'string') {
      // Try to parse if it's a JSON string
      try {
        const parsed = JSON.parse(roleSkills);
        requiredSkills = Array.isArray(parsed) ? parsed : [];
      } catch {
        // If parsing fails and it's a non-empty string, treat as single skill
        if (roleSkills.trim() !== '' && roleSkills !== '[]') {
          requiredSkills = [roleSkills];
        }
      }
    }

    // If no skills required (empty array), always match
    if (requiredSkills.length === 0) return true;

    // Skills are required but candidate has no skills
    if (!candidateSkills || candidateSkills.length === 0) return false;

    // Check if candidate has at least one required skill
    return requiredSkills.some((skill) =>
      candidateSkills.some((candidateSkill) =>
        candidateSkill.toLowerCase().includes(skill.toLowerCase()),
      ),
    );
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

      // Use totalExperience (preferred) or fall back to experience field
      const candidateExperience = candidate.totalExperience ?? candidate.experience;

      // Experience scoring (40 points)
      if (
        candidateExperience &&
        this.matchExperience(
          candidateExperience,
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

  /**
   * Get project candidates by role (for role-based access)
   * Returns candidates filtered by user role and permissions
   */
  async getProjectCandidatesByRole(
    projectId: string,
    userRole: string,
    userId: string,
  ): Promise<any[]> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
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
                experience: true,
                skills: true,
                expectedSalary: true,
              },
            },
            recruiter: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            currentProjectStatus: true,
          },
        },
        rolesNeeded: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Filter candidates based on user role
    switch (userRole) {
      case 'Recruiter':
        // Recruiters see only candidates assigned to them
        return project.candidateProjects
          .filter((cp) => cp.recruiterId === userId)
          .map((cp) => ({
            ...cp,
            matchScore: this.calculateMatchScore(
              cp.candidate,
              project.rolesNeeded,
            ),
          }));

      case 'Documentation Executive':
        // Documentation executives see candidates in verification stages
        return project.candidateProjects
          .filter((cp) =>
            [
              'verification_in_progress',
              'pending_documents',
              'documents_verified',
            ].includes(cp.currentProjectStatus.statusName),
          )
          .map((cp) => ({
            ...cp,
            matchScore: this.calculateMatchScore(
              cp.candidate,
              project.rolesNeeded,
            ),
          }));

      case 'Processing Executive':
        // Processing executives see verified candidates
        return project.candidateProjects
          .filter((cp) =>
            ['documents_verified', 'approved', 'processing'].includes(
              cp.currentProjectStatus.statusName,
            ),
          )
          .map((cp) => ({
            ...cp,
            matchScore: this.calculateMatchScore(
              cp.candidate,
              project.rolesNeeded,
            ),
          }));

      default:
        // Managers, Team Heads, Team Leads see all candidates
        return project.candidateProjects.map((cp) => ({
          ...cp,
          matchScore: this.calculateMatchScore(
            cp.candidate,
            project.rolesNeeded,
          ),
        }));
    }
  }

  /**
   * Get candidates for document verification dashboard
   * Returns candidates in verification stages with document status
   */
  async getDocumentVerificationCandidates(projectId: string): Promise<any[]> {
    const candidates = await this.prisma.candidateProjects.findMany({
      where: {
        projectId,
        currentProjectStatus: {
          statusName: {
            in: [
              'verification_in_progress',
              'pending_documents',
              'documents_verified',
            ],
          },
        },
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
            experience: true,
            skills: true,
            expectedSalary: true,
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

    return candidates.map((candidate) => ({
      ...candidate,
      documentStatus: 'pending_verification', // Simplified for now
      totalDocuments: 0, // Will be calculated from actual documents
      verifiedDocuments: 0,
      pendingDocuments: 0,
    }));
  }

  /**
   * Send candidate for verification
   * Updates candidate status to verification_in_progress
   */
  async sendForVerification(
    projectId: string,
    candidateId: string,
    userId: string,
  ): Promise<any> {
    const candidateProject = await this.prisma.candidateProjects.findFirst({
      where: {
        projectId,
        candidateId,
      },
    });

    if (!candidateProject) {
      throw new NotFoundException('Candidate not found in project');
    }

    // Check if candidate is nominated (status ID 1)
    if (candidateProject.currentProjectStatusId !== 1) {
      throw new BadRequestException(
        'Candidate must be nominated before sending for verification',
      );
    }

    // Find verification_in_progress status
    const verificationStatus = await this.prisma.candidateProjectStatus.findFirst({
      where: { statusName: 'verification_in_progress' },
    });

    if (!verificationStatus) {
      throw new BadRequestException('Verification status not found in system');
    }

    const updated = await this.prisma.candidateProjects.update({
      where: { id: candidateProject.id },
      data: {
        currentProjectStatusId: verificationStatus.id,
        updatedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Calculate document verification status for a candidate
   */
  private calculateDocumentStatus(documents: any[]): string {
    if (documents.length === 0) return 'no_documents';

    const verifiedCount = documents.filter(
      (doc) => doc.verifications[0]?.status === 'verified',
    ).length;

    const rejectedCount = documents.filter(
      (doc) => doc.verifications[0]?.status === 'rejected',
    ).length;

    const pendingCount = documents.filter(
      (doc) =>
        !doc.verifications[0] || doc.verifications[0].status === 'pending',
    ).length;

    if (verifiedCount === documents.length) return 'all_verified';
    if (rejectedCount > 0) return 'has_rejected';
    if (pendingCount > 0) return 'pending_verification';

    return 'unknown';
  }

  /**
   * Auto-allocate existing eligible candidates to a new project
   */
  private async autoAllocateCandidatesToProject(
    projectId: string,
  ): Promise<void> {
    // Get project with roles needed
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        rolesNeeded: true,
        team: {
          include: {
            userTeams: {
              include: {
                user: {
                  include: {
                    userRoles: {
                      include: {
                        role: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!project || !project.rolesNeeded || project.rolesNeeded.length === 0) {
      return; // No roles to allocate for
    }

    // Get all global recruiters (not project-specific)
    const recruiters = await this.getAllRecruiters();

    if (recruiters.length === 0) {
      return;
    }

    // Create service instances
    const eligibilityService = new UnifiedEligibilityService(this.prisma);
    const candidateMatchingService = new CandidateMatchingService(
      this.prisma,
      eligibilityService,
    );
    const recruiterPoolService = new RecruiterPoolService(this.prisma);
    const roundRobinService = new RoundRobinService(this.prisma);
    const outboxService = new OutboxService(this.prisma);

    const allocationService = new CandidateAllocationService(
      this.prisma,
      candidateMatchingService,
      recruiterPoolService,
      roundRobinService,
      outboxService,
    );

    // Allocate candidates for each role
    for (const role of project.rolesNeeded) {
      try {
        await allocationService.allocateForRole(projectId, role.id, recruiters);
      } catch (error) {
        console.error(
          `Failed to allocate candidates for role ${role.id}:`,
          error,
        );
      }
    }
  }

  /**
   * Get recruiters assigned to a project
   */
  /**
   * Get all global recruiters with workload calculation
   */
  private async getAllRecruiters(): Promise<any[]> {
    const recruiters = await this.prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: 'Recruiter',
            },
          },
        },
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
        _count: {
          select: {
            candidateProjectMaps: {
              where: {
                currentProjectStatus: {
                  statusName: {
                    in: [
                      'nominated',
                      'verification_in_progress',
                      'pending_documents',
                    ],
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        id: 'asc', // Deterministic order for round-robin
      },
    });

    return recruiters.map((recruiter) => ({
      id: recruiter.id,
      name: recruiter.name,
      email: recruiter.email,
      workload: recruiter._count.candidateProjectMaps,
      roles: recruiter.userRoles.map((ur) => ur.role.name),
    }));
  }

  /**
   * Get recruiters assigned to a project (DEPRECATED - use getAllRecruiters for global allocation)
   */
  private async getProjectRecruiters(projectId: string): Promise<any[]> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        team: {
          include: {
            userTeams: {
              include: {
                user: {
                  include: {
                    userRoles: {
                      include: {
                        role: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!project?.team) {
      return [];
    }

    // Filter users with Recruiter role and calculate workload
    const recruiters = await Promise.all(
      project.team.userTeams
        .map((ut) => ut.user)
        .filter((user) =>
          user.userRoles.some((ur) => ur.role.name === 'Recruiter'),
        )
        .map(async (user) => {
          // Calculate current workload (active candidates)
          const workload = await this.prisma.candidateProjects.count({
            where: {
              recruiterId: user.id,
              currentProjectStatus: {
                statusName: {
                  in: [
                    'nominated',
                    'verification_in_progress',
                    'pending_documents',
                  ],
                },
              },
            },
          });

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            workload,
          };
        }),
    );

    return recruiters;
  }

  // ==================== DOCUMENT REQUIREMENTS ====================

  /**
   * Get document requirements for a project
   */
  async getDocumentRequirements(projectId: string): Promise<any[]> {
    const requirements = await this.prisma.documentRequirement.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    return requirements;
  }

  /**
   * Add document requirement to project
   */
  async addDocumentRequirement(
    projectId: string,
    dto: { docType: string; mandatory: boolean; description?: string },
    userId: string,
  ): Promise<any> {
    // Check if project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check if requirement already exists
    const existing = await this.prisma.documentRequirement.findUnique({
      where: {
        projectId_docType: {
          projectId,
          docType: dto.docType,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Document requirement already exists for this project',
      );
    }

    const requirement = await this.prisma.documentRequirement.create({
      data: {
        projectId,
        docType: dto.docType,
        mandatory: dto.mandatory,
        description: dto.description,
      },
    });

    return requirement;
  }

  /**
   * Update document requirement
   */
  async updateDocumentRequirement(
    projectId: string,
    reqId: string,
    dto: { mandatory?: boolean; description?: string },
    userId: string,
  ): Promise<any> {
    // Check if requirement exists and belongs to project
    const requirement = await this.prisma.documentRequirement.findFirst({
      where: {
        id: reqId,
        projectId,
      },
    });

    if (!requirement) {
      throw new NotFoundException('Document requirement not found');
    }

    const updated = await this.prisma.documentRequirement.update({
      where: { id: reqId },
      data: {
        mandatory: dto.mandatory,
        description: dto.description,
        updatedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Remove document requirement
   */
  async removeDocumentRequirement(
    projectId: string,
    reqId: string,
    userId: string,
  ): Promise<any> {
    // Check if requirement exists and belongs to project
    const requirement = await this.prisma.documentRequirement.findFirst({
      where: {
        id: reqId,
        projectId,
      },
    });

    if (!requirement) {
      throw new NotFoundException('Document requirement not found');
    }

    await this.prisma.documentRequirement.delete({
      where: { id: reqId },
    });

    return { success: true };
  }

  /**
   * Complete document verification for a candidate
   */
  async completeVerification(
    projectId: string,
    candidateId: string,
    userId: string,
  ): Promise<any> {
    const candidateProject = await this.prisma.candidateProjects.findFirst({
      where: {
        projectId,
        candidateId,
      },
    });

    if (!candidateProject) {
      throw new NotFoundException('Candidate not found in project');
    }

    // Check if all required documents are verified
    const summary = await this.getDocumentVerificationSummary(
      candidateProject.id,
    );

    if (!summary.allDocumentsVerified) {
      throw new BadRequestException('Not all required documents are verified');
    }

    // Find documents_verified status
    const verifiedStatus = await this.prisma.candidateProjectStatus.findFirst({
      where: { statusName: 'documents_verified' },
    });

    if (!verifiedStatus) {
      throw new BadRequestException('Documents verified status not found in system');
    }

    // Update status to documents_verified
    const updated = await this.prisma.candidateProjects.update({
      where: { id: candidateProject.id },
      data: {
        currentProjectStatusId: verifiedStatus.id,
        updatedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Get document verification summary for a candidate-project
   */
  private async getDocumentVerificationSummary(
    candidateProjectMapId: string,
  ): Promise<any> {
    // Get project document requirements
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id: candidateProjectMapId },
      include: { project: true },
    });

    if (!candidateProject) {
      throw new NotFoundException('Candidate project mapping not found');
    }

    const requirements = await this.prisma.documentRequirement.findMany({
      where: { projectId: candidateProject.projectId },
    });

    // Get document verifications
    const verifications =
      await this.prisma.candidateProjectDocumentVerification.findMany({
        where: { candidateProjectMapId },
        include: { document: true },
      });

    const totalRequired = requirements.length;
    const totalSubmitted = verifications.length;
    const totalVerified = verifications.filter(
      (v) => v.status === 'verified',
    ).length;
    const totalRejected = verifications.filter(
      (v) => v.status === 'rejected',
    ).length;
    const totalPending = verifications.filter(
      (v) => v.status === 'pending',
    ).length;

    const allDocumentsVerified =
      totalVerified === totalRequired && totalRequired > 0;

    return {
      totalRequired,
      totalSubmitted,
      totalVerified,
      totalRejected,
      totalPending,
      allDocumentsVerified,
      canApproveCandidate: allDocumentsVerified,
    };
  }
}
