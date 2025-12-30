import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { RoundRobinService } from '../round-robin/round-robin.service';
import { PrismaService } from '../database/prisma.service';
import { CountriesService } from '../countries/countries.service';
import { RoleCatalogService } from '../role-catalog/role-catalog.service';
import { QualificationsService } from '../qualifications/qualifications.service';
import {
  CreateProjectDto,
  CreateRoleNeededDto,
} from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { AssignCandidateDto } from './dto/assign-candidate.dto';
import {
  ProjectWithRelations,
  PaginatedProjects,
  ProjectStats,
  RecruiterAnalytics,
} from './types';
import {
  CANDIDATE_PROJECT_STATUS,
  CANDIDATE_STATUS,
} from '../common/constants/statuses';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly countriesService: CountriesService,
    private readonly qualificationsService: QualificationsService,
    private readonly roleCatalogService: RoleCatalogService,
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
    // Normalize clientId: treat empty string as null, validate only if non-empty
    if (createProjectDto.clientId !== undefined && createProjectDto.clientId !== null) {
      const trimmed = String(createProjectDto.clientId).trim();
      if (trimmed === '') {
        createProjectDto.clientId = null as any;
      } else {
        createProjectDto.clientId = trimmed as any;
        const client = await this.prisma.client.findUnique({
          where: { id: createProjectDto.clientId },
        });
        if (!client) {
          throw new NotFoundException(
            `Client with ID ${createProjectDto.clientId} not found`,
          );
        }
      }
    }

    // Normalize teamId: treat empty string as null, validate only if non-empty
    if (createProjectDto.teamId !== undefined && createProjectDto.teamId !== null) {
      const trimmedTeam = String(createProjectDto.teamId).trim();
      if (trimmedTeam === '') {
        createProjectDto.teamId = null as any;
      } else {
        createProjectDto.teamId = trimmedTeam as any;
        const team = await this.prisma.team.findUnique({
          where: { id: createProjectDto.teamId },
        });
        if (!team) {
          throw new NotFoundException(
            `Team with ID ${createProjectDto.teamId} not found`,
          );
        }
      }
    }

    // Validate deadline is in the future if provided
    if (createProjectDto.deadline) {
      const deadline = new Date(createProjectDto.deadline);
      if (deadline <= new Date()) {
        throw new BadRequestException('Project deadline must be in the future');
      }
    }

    // Validate / normalize country code if provided
    // Treat empty string (""/"   ") as intent to clear the field and store null
    if (
      createProjectDto.countryCode !== undefined &&
      createProjectDto.countryCode !== null
    ) {
      const trimmed = String(createProjectDto.countryCode).trim();
      if (trimmed === '') {
        // user supplied an empty string -> clear the value
        createProjectDto.countryCode = null as any;
      } else {
        const upper = trimmed.toUpperCase();
        const isValidCountry =
          await this.countriesService.validateCountryCode(upper);
        if (!isValidCountry) {
          throw new BadRequestException(
            `Invalid or inactive country code: ${createProjectDto.countryCode}`,
          );
        }
        // normalize to uppercase for storage
        createProjectDto.countryCode = upper as any;
      }
    }

    // Validate education requirements for all roles
    if (createProjectDto.rolesNeeded) {
      for (const role of createProjectDto.rolesNeeded) {
        // Validate optional roleCatalogId
        if (role.roleCatalogId) {
          const exists = await this.roleCatalogService.validateRoleId(
            role.roleCatalogId,
          );
          if (!exists) {
            throw new NotFoundException(
              `RoleCatalog with ID ${role.roleCatalogId} not found or inactive for role: ${role.designation}`,
            );
          }
        }
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
          countryCode: createProjectDto.countryCode ?? null,
          // New project-level fields
          projectType: createProjectDto.projectType || 'private',
          resumeEditable: createProjectDto.resumeEditable ?? true,
          groomingRequired: createProjectDto.groomingRequired || 'formal',
          hideContactInfo: createProjectDto.hideContactInfo ?? true,
          requiredScreening: createProjectDto.requiredScreening ?? false,
        },
      });

      // Create roles needed if provided
      if (
        createProjectDto.rolesNeeded &&
        createProjectDto.rolesNeeded.length > 0
      ) {
        for (const role of createProjectDto.rolesNeeded) {
          // validate ageRequirement format (expected like "18 to 25") and parse into minAge/maxAge
          const AGE_RE = /^\s*(\d+)\s*to\s*(\d+)\s*$/i;
          const ageMatch = role.ageRequirement?.match(AGE_RE);
          if (!ageMatch) {
            throw new BadRequestException(
              `Invalid or missing ageRequirement for role: ${role.designation}. Expected format like "18 to 25".`,
            );
          }
          const minAge = parseInt(ageMatch[1], 10);
          const maxAge = parseInt(ageMatch[2], 10);
          if (isNaN(minAge) || isNaN(maxAge) || minAge > maxAge) {
            throw new BadRequestException(
              `Invalid age range for role: ${role.designation}. Ensure age is like "18 to 25" with min <= max.`,
            );
          }
          const createdRole = await tx.roleNeeded.create({
            data: {
              projectId: createdProject.id,
              roleCatalogId: role.roleCatalogId,
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
              minAge,
              maxAge,
              accommodation: role.accommodation,
              food: role.food,
              transport: role.transport,
              target: role.target,
              // New fields
              employmentType: role.employmentType || 'permanent',
              contractDurationYears: role.contractDurationYears,
              genderRequirement: (role.genderRequirement || 'all') as any,
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
            roleCatalog: {
              select: {
                id: true,
                name: true,
                label: true,
                shortName: true,
                roleDepartment: { select: { id: true, name: true, shortName: true } },
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

    // Normalize rolesNeeded to include ageRequirement string
    const normalized = {
      ...completeProject,
      rolesNeeded: completeProject.rolesNeeded.map((role) => ({
        ...role,
        requiredSkills: this.parseJsonField(role.requiredSkills as any),
        candidateStates: this.parseJsonField(role.candidateStates as any),
        candidateReligions: this.parseJsonField(role.candidateReligions as any),
        skills: this.parseJsonField(role.skills as any),
        languageRequirements: this.parseJsonField(role.languageRequirements as any),
        licenseRequirements: this.parseJsonField(role.licenseRequirements as any),
        requiredCertifications: this.parseJsonField(role.requiredCertifications as any),
        specificExperience: this.parseJsonField(role.specificExperience as any),
        salaryRange: this.parseJsonField(role.salaryRange as any),
        educationRequirements: this.parseJsonField(role.educationRequirements as any),
        technicalSkills: this.parseJsonField(role.technicalSkills as any),
        ageRequirement: role.minAge != null && role.maxAge != null ? `${role.minAge} to ${role.maxAge}` : null,
      })),
    };

    return normalized;
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
        // Add computed age string for convenience (e.g., "18 to 25")
        ageRequirement: role.minAge != null && role.maxAge != null ? `${role.minAge} to ${role.maxAge}` : null,
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
            roleCatalog: {
              select: {
                id: true,
                name: true,
                label: true,
                shortName: true,
                roleDepartment: { select: { id: true, name: true, shortName: true } },
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
        ageRequirement: role.minAge != null && role.maxAge != null ? `${role.minAge} to ${role.maxAge}` : null,
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
    // Normalize and validate clientId when provided (allow clearing via empty string/null)
    if (updateProjectDto.clientId !== undefined) {
      if (updateProjectDto.clientId === null || String(updateProjectDto.clientId).trim() === '') {
        // caller wants to clear client
        updateProjectDto.clientId = null as any;
      } else {
        updateProjectDto.clientId = String(updateProjectDto.clientId).trim() as any;
        const client = await this.prisma.client.findUnique({
          where: { id: updateProjectDto.clientId },
        });
        if (!client) {
          throw new NotFoundException(
            `Client with ID ${updateProjectDto.clientId} not found`,
          );
        }
      }
    }

    // Normalize and validate teamId when provided (allow clearing via empty string/null)
    if (updateProjectDto.teamId !== undefined) {
      if (updateProjectDto.teamId === null || String(updateProjectDto.teamId).trim() === '') {
        updateProjectDto.teamId = null as any;
      } else {
        updateProjectDto.teamId = String(updateProjectDto.teamId).trim() as any;
        const team = await this.prisma.team.findUnique({
          where: { id: updateProjectDto.teamId },
        });
        if (!team) {
          throw new NotFoundException(
            `Team with ID ${updateProjectDto.teamId} not found`,
          );
        }
      }
    }

    // Note: No deadline validation for updates - existing projects can have past deadlines

    // Validate / normalize country code if updating
    // If caller provided countryCode explicitly, accept null or empty-string as "clear value".
    if (updateProjectDto.countryCode !== undefined) {
      if (
        updateProjectDto.countryCode === null ||
        String(updateProjectDto.countryCode).trim() === ''
      ) {
        // will clear the countryCode (set to null)
      } else {
        const upper = String(updateProjectDto.countryCode).trim().toUpperCase();
        const isValidCountry =
          await this.countriesService.validateCountryCode(upper);
        if (!isValidCountry) {
          throw new BadRequestException(
            `Invalid or inactive country code: ${updateProjectDto.countryCode}`,
          );
        }
        // assign the normalized value back so the updateData assignment below is consistent
        updateProjectDto.countryCode = upper as any;
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
    if (updateProjectDto.countryCode !== undefined) {
      // If caller explicitly passed null or an empty string, clear the field
      if (
        updateProjectDto.countryCode === null ||
        String(updateProjectDto.countryCode).trim() === ''
      ) {
        updateData.countryCode = null;
      } else {
        // updateProjectDto.countryCode was normalized to uppercase above
        updateData.countryCode = String(
          updateProjectDto.countryCode,
        ).toUpperCase();
      }
    }
    // New project-level fields
    if (updateProjectDto.projectType !== undefined)
      updateData.projectType = updateProjectDto.projectType;
    if (updateProjectDto.resumeEditable !== undefined)
      updateData.resumeEditable = updateProjectDto.resumeEditable;
    if (updateProjectDto.groomingRequired !== undefined)
      updateData.groomingRequired = updateProjectDto.groomingRequired;
    if (updateProjectDto.hideContactInfo !== undefined)
      updateData.hideContactInfo = updateProjectDto.hideContactInfo;
    if (updateProjectDto.requiredScreening !== undefined)
      updateData.requiredScreening = updateProjectDto.requiredScreening;

    // Handle rolesNeeded updates if provided
    if (updateProjectDto.rolesNeeded !== undefined) {
      // Delete existing roles needed
      await this.prisma.roleNeeded.deleteMany({
        where: { projectId: id },
      });

      // Create new roles needed
      if (updateProjectDto.rolesNeeded.length > 0) {
        for (const role of updateProjectDto.rolesNeeded) {
          // validate ageRequirement format (expected like "18 to 25") and parse into minAge/maxAge
          const AGE_RE = /^\s*(\d+)\s*to\s*(\d+)\s*$/i;
          const ageMatch = role.ageRequirement?.match(AGE_RE);
          if (!ageMatch) {
            throw new BadRequestException(
              `Invalid or missing ageRequirement for role: ${role.designation}. Expected format like "18 to 25".`,
            );
          }
          const minAge = parseInt(ageMatch[1], 10);
          const maxAge = parseInt(ageMatch[2], 10);
          if (isNaN(minAge) || isNaN(maxAge) || minAge > maxAge) {
            throw new BadRequestException(
              `Invalid age range for role: ${role.designation}. Ensure age is like "18 to 25" with min <= max.`,
            );
          }
            // Validate optional roleCatalogId
            if (role.roleCatalogId) {
              const exists = await this.roleCatalogService.validateRoleId(
                role.roleCatalogId,
              );
              if (!exists) {
                throw new NotFoundException(
                  `RoleCatalog with ID ${role.roleCatalogId} not found or inactive for role: ${role.designation}`,
                );
              }
            }
          const createdRole = await this.prisma.roleNeeded.create({
            data: {
              projectId: id,
                roleCatalogId: role.roleCatalogId,
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
              minAge,
              maxAge,
              accommodation: role.accommodation,
              food: role.food,
              transport: role.transport,
              target: role.target,
              // New fields
              employmentType: role.employmentType || 'permanent',
              contractDurationYears: role.contractDurationYears,
              genderRequirement: (role.genderRequirement || 'all') as any,
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

    // If caller provided documentRequirements during update, upsert (create/update) them.
    if (updateProjectDto.documentRequirements !== undefined) {
      for (const dto of updateProjectDto.documentRequirements) {
        // If id provided, update existing
        if ((dto as any).id) {
          const existing = await this.prisma.documentRequirement.findFirst({
            where: { id: (dto as any).id, projectId: id },
          });
          if (!existing) {
            throw new NotFoundException(
              `Document requirement with ID ${(dto as any).id} not found for project ${id}`,
            );
          }

          await this.prisma.documentRequirement.update({
            where: { id: (dto as any).id },
            data: {
              mandatory:
                dto.mandatory !== undefined ? dto.mandatory : existing.mandatory,
              description:
                dto.description !== undefined ? dto.description : existing.description,
              updatedAt: new Date(),
            },
          });
        } else {
          // Create new, ensure no duplicate docType for project
          const duplicate = await this.prisma.documentRequirement.findUnique({
            where: { projectId_docType: { projectId: id, docType: dto.docType } },
          });
          if (duplicate) {
            throw new BadRequestException(
              `Document requirement already exists for this project: ${dto.docType}`,
            );
          }
          await this.prisma.documentRequirement.create({
            data: {
              projectId: id,
              docType: dto.docType,
              mandatory: dto.mandatory,
              description: dto.description,
            },
          });
        }
      }
    }

    // Re-fetch project to include updated document requirements and related relations
    const refreshedProject = await this.prisma.project.findUnique({
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

    if (!refreshedProject) {
      throw new NotFoundException(`Project with ID ${id} not found after update`);
    }

    // Normalize rolesNeeded to include ageRequirement string
    const normalizedProject = {
      ...refreshedProject,
      rolesNeeded: refreshedProject.rolesNeeded.map((role) => ({
        ...role,
        requiredSkills: this.parseJsonField(role.requiredSkills as any),
        candidateStates: this.parseJsonField(role.candidateStates as any),
        candidateReligions: this.parseJsonField(role.candidateReligions as any),
        skills: this.parseJsonField(role.skills as any),
        languageRequirements: this.parseJsonField(role.languageRequirements as any),
        licenseRequirements: this.parseJsonField(role.licenseRequirements as any),
        requiredCertifications: this.parseJsonField(role.requiredCertifications as any),
        specificExperience: this.parseJsonField(role.specificExperience as any),
        salaryRange: this.parseJsonField(role.salaryRange as any),
        educationRequirements: this.parseJsonField(role.educationRequirements as any),
        technicalSkills: this.parseJsonField(role.technicalSkills as any),
        ageRequirement: role.minAge != null && role.maxAge != null ? `${role.minAge} to ${role.maxAge}` : null,
      })),
    };

    return normalizedProject;
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
            roleCatalog: {
              include: { roleDepartment: true },
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
      whereClause.AND.push({
        OR: [{ mainStatus: { name: status } }, { subStatus: { name: status } }],
      });
    } else if (statusId) {
      // Backwards compatible: statusId matches either mainStatusId OR subStatusId
      whereClause.AND = whereClause.AND || [];
      whereClause.AND.push({
        OR: [{ mainStatusId: statusId }, { subStatusId: statusId }],
      });
    }

    const isRecruiter =
      userRoles.includes('Recruiter') &&
      !userRoles.includes('Manager') &&
      !userRoles.includes('CEO') &&
      !userRoles.includes('Director');

    if (isRecruiter) {
      whereClause.AND = whereClause.AND || [];
      whereClause.AND.push({
        OR: [
          { recruiterId: userId },
          {
            candidate: {
              recruiterAssignments: {
                some: {
                  recruiterId: userId,
                  isActive: true,
                },
              },
            },
          },
        ],
      });
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
            workExperiences: {
              select: {
                id: true,
                roleCatalogId: true,
                startDate: true,
                endDate: true,
                isCurrent: true,
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
                roleCatalog: {
                  include: { roleDepartment: true },
                },
              },
            },
            documentRequirements: {
              select: {
                id: true,
                docType: true,
                mandatory: true,
                description: true,
                createdAt: true,
                updatedAt: true,
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        },

        // Include the role this candidate was nominated for (if any)
        roleNeeded: {
          include: {
            educationRequirementsList: {
              include: { qualification: true },
            },
            roleCatalog: {
              include: { roleDepartment: true },
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

        projectStatusHistory: {
          select: {
            mainStatus: { select: { name: true } },
            subStatus: { select: { name: true } },
          },
        },

        // Document verifications for this candidate-project mapping
        documentVerifications: {
          select: {
            id: true,
            status: true,
            notes: true,
            rejectionReason: true,
            resubmissionRequested: true,
            createdAt: true,
            updatedAt: true,
            document: {
              select: {
                id: true,
                docType: true,
                fileName: true,
                fileUrl: true,
                status: true,
                notes: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
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

      // If candidate was nominated for a specific role (roleNeeded), score only that role
      const nominatedRole =
        (assignment as any).roleNeeded ||
        (assignment.project?.rolesNeeded || []).find(
          (r) => r.id === (assignment as any).roleNeededId,
        );

      // If nominated for a specific role, use that role only; otherwise pick top role from project.rolesNeeded
      let matchScoreObj: any = { roleId: null, roleName: null, score: 0 };
      let nominatedRoleObj: any = null;

      if (nominatedRole) {
        const score = this.calculateRoleMatchScore(c, nominatedRole);
        const roleCatalogId = (nominatedRole as any).roleCatalogId ?? null;
        const roleDepartmentName = (nominatedRole as any).roleCatalog?.roleDepartment?.name ?? null;
        const roleDepartmentLabel = (nominatedRole as any).roleCatalog?.roleDepartment?.label ?? null;
        matchScoreObj = {
          roleId: nominatedRole.id,
          roleName: nominatedRole.designation,
          roleCatalogId,
          roleDepartmentName,
          roleDepartmentLabel,
          score,
        };
        nominatedRoleObj = { id: nominatedRole.id, designation: nominatedRole.designation, score };
      } else {
        const roleMatches = (project.rolesNeeded || []).map((role) => ({
          roleId: role.id,
          designation: role.designation,
          roleCatalogId: role.roleCatalogId ?? null,
          roleDepartmentName: (role as any).roleCatalog?.roleDepartment?.name ?? null,
          roleDepartmentLabel: (role as any).roleCatalog?.roleDepartment?.label ?? null,
          score: this.calculateRoleMatchScore(c, role),
        }));
        const top = roleMatches.reduce((best, cur) => (cur.score > (best?.score ?? -1) ? cur : best), null as any);
        if (top) {
          matchScoreObj = {
            roleId: top.roleId,
            roleName: top.designation,
            roleCatalogId: top.roleCatalogId,
            roleDepartmentName: top.roleDepartmentName,
            roleDepartmentLabel: top.roleDepartmentLabel,
            score: top.score,
          };
        }
      }

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

        // Qualifications (structured) and explicit candidateExperience
        qualifications: c.qualifications.map((q) => ({
          id: q.qualification.id,
          name: q.qualification.name,
          level: q.qualification.level,
          field: q.qualification.field,
        })),
        candidateQualifications: c.qualifications.map((q) => ({
          id: q.qualification.id,
          name: q.qualification.name,
          level: q.qualification.level,
          field: q.qualification.field,
        })),
        candidateExperience: c.totalExperience ?? c.experience,

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
              documentRequirements: assignment.project.documentRequirements || [],
            }
          : null,

        // Metadata
        nominatedAt: assignment.createdAt,
        assignedAt: assignment.assignedAt,
        notes: assignment.notes,

        // Match Score (object with top role info)
        matchScore: matchScoreObj,
        nominatedRole: nominatedRoleObj,

        // Document verifications for this project
        documentVerifications: assignment.documentVerifications || [],

        isSendedForDocumentVerification: assignment.projectStatusHistory.some(
          (h) =>
            h.mainStatus?.name === 'documents' ||
            [
              'verification_in_progress_document',
              'pending_documents',
              'documents_verified',
              'rejected_documents',
            ].includes(h.subStatus?.name || ''),
        ),
      };
    });

    // ---------------------------------------------
    // 6. Sorting
    // ---------------------------------------------
    let sorted = [...candidatesWithScore];

    if (sortBy === 'matchScore') {
      sorted.sort((a, b) => {
        const aScore = typeof a.matchScore === 'number' ? a.matchScore : a.matchScore?.score ?? 0;
        const bScore = typeof b.matchScore === 'number' ? b.matchScore : b.matchScore?.score ?? 0;
        return sortOrder === 'desc' ? bScore - aScore : aScore - bScore;
      });
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

  async getRecruiterAnalytics(
    recruiterId: string,
    roles: string[] = [],
  ): Promise<RecruiterAnalytics> {
    if (!roles?.includes('Recruiter')) {
      throw new ForbiddenException(
        'Recruiter analytics are only available to Recruiter role',
      );
    }

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const upcomingWindow = new Date(now);
    upcomingWindow.setDate(upcomingWindow.getDate() + 14);
    const terminalProjectStatuses = [
      CANDIDATE_PROJECT_STATUS.HIRED,
      CANDIDATE_PROJECT_STATUS.REJECTED_DOCUMENTS,
      CANDIDATE_PROJECT_STATUS.REJECTED_INTERVIEW,
      CANDIDATE_PROJECT_STATUS.REJECTED_SELECTION,
      CANDIDATE_PROJECT_STATUS.WITHDRAWN,
    ];
    const excludedProjectStatuses = ['completed', 'cancelled', 'archived'];
    const untouchedCandidateWhere = {
      currentStatus: {
        statusName: CANDIDATE_STATUS.UNTOUCHED,
      },
      recruiterAssignments: {
        some: {
          recruiterId,
          isActive: true,
        },
      },
    };

    const urgentProjectRecord = await this.prisma.project.findFirst({
      where: {
        priority: { in: ['high', 'urgent'] },
        deadline: { not: null, gte: now },
        status: {
          notIn: excludedProjectStatuses,
        },
      },
      orderBy: { deadline: 'asc' },
      select: {
        id: true,
        title: true,
        deadline: true,
        priority: true,
        client: { select: { name: true } },
      },
    });

    const overdueProjectRecords = await this.prisma.project.findMany({
      where: {
        deadline: { not: null, lt: startOfToday },
        status: {
          notIn: excludedProjectStatuses,
        },
      },
      orderBy: { deadline: 'asc' },
      take: 6,
      select: {
        id: true,
        title: true,
        deadline: true,
        client: { select: { name: true } },
      },
    });

    const [
      hiredOrSelectedCount,
      activeCandidateCount,
      upcomingInterviewsCount,
      assignedProjects,
      untouchedCandidatesCount,
      untouchedCandidateRows,
    ] = await this.prisma.$transaction([
      this.prisma.candidateProjects.count({
        where: {
          recruiterId,
          currentProjectStatus: {
            statusName: { in: ['selected', 'hired'] },
          },
        },
      }),
      this.prisma.candidateProjects.count({
        where: {
          recruiterId,
          currentProjectStatus: {
            statusName: { notIn: ['selected', 'hired'] },
          },
        },
      }),
      this.prisma.interview.count({
        where: {
          candidateProjectMap: { recruiterId },
          scheduledTime: {
            gte: now,
            lte: upcomingWindow,
          },
        },
      }),
      this.prisma.candidateProjects.groupBy({
        by: ['projectId'],
        where: { recruiterId },
        orderBy: {
          projectId: 'asc',
        },
      }),
      this.prisma.candidate.count({
        where: untouchedCandidateWhere,
      }),
      this.prisma.candidate.findMany({
        where: untouchedCandidateWhere,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          countryCode: true,
          currentRole: true,
          projects: {
            where: { recruiterId },
            select: {
              project: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'asc' },
        take: 6,
      }),
    ]);

    const urgentProject = urgentProjectRecord
      ? {
          id: urgentProjectRecord.id,
          title: urgentProjectRecord.title,
          priority: urgentProjectRecord.priority,
          deadline: urgentProjectRecord.deadline,
          clientName: urgentProjectRecord.client?.name ?? null,
          daysUntilDeadline: urgentProjectRecord.deadline
            ? Math.max(
                0,
                Math.ceil(
                  (urgentProjectRecord.deadline.getTime() - now.getTime()) /
                    (1000 * 60 * 60 * 24),
                ),
              )
            : null,
        }
      : null;

    return {
      urgentProject,
      overdueProjects: overdueProjectRecords.map((project) => ({
        id: project.id,
        title: project.title,
        clientName: project.client?.name ?? null,
        overdueDays: project.deadline
          ? Math.max(
              1,
              Math.ceil(
                (now.getTime() - project.deadline.getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            )
          : null,
      })),
      hiredOrSelectedCount,
      activeCandidateCount,
      upcomingInterviewsCount,
      assignedProjectCount: assignedProjects.length,
      untouchedCandidatesCount,
      untouchedCandidates: untouchedCandidateRows.map((candidate) => {
        const latestProject = candidate.projects?.[0]?.project;
        return {
          id: candidate.id,
          name: `${candidate.firstName} ${candidate.lastName}`.trim(),
          countryCode: candidate.countryCode ?? null,
          currentRole: candidate.currentRole ?? null,
          assignedProjectId: latestProject?.id ?? null,
          assignedProjectTitle: latestProject?.title ?? null,
        };
      }),
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
        rolesNeeded: {
          include: {
            educationRequirementsList: {
              include: { qualification: true },
            },
            roleCatalog: {
              include: { roleDepartment: true },
            },
          },
        },
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
        // include work experiences so we can match roleCatalog-specific experience
        workExperiences: {
          select: {
            id: true,
            roleCatalogId: true,
            startDate: true,
            endDate: true,
            isCurrent: true,
          },
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
    // 5. RETURN MATCH SCORE (TOP ROLE ONLY)
    // --------------------------------
    return matchedCandidates.map((candidate) => {
      const roleMatches = project.rolesNeeded.map((role) => ({
        roleId: role.id,
        designation: role.designation,
        roleCatalogId: role.roleCatalogId ?? null,
        roleDepartmentName: (role as any).roleCatalog?.roleDepartment?.name ?? null,
        roleDepartmentLabel: (role as any).roleCatalog?.roleDepartment?.label ?? null,
        score: this.calculateRoleMatchScore(candidate, role),
      }));

      // pick top role by score
      const top = roleMatches.reduce((best, cur) => (cur.score > (best?.score ?? -1) ? cur : best), null as any);

      return {
        ...candidate,
        // matchScore is now an object describing the top role match
        matchScore: top
          ? {
              roleId: top.roleId,
              roleName: top.designation,
              roleCatalogId: top.roleCatalogId,
              roleDepartmentName: top.roleDepartmentName,
              roleDepartmentLabel: top.roleDepartmentLabel,
              score: top.score,
            }
          : { roleId: null, roleName: null, score: 0 },
        // NOTE: intentionally do not include full roleMatches array (avoids showing all roles)
      };
    });
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
      totalScore += this.calculateRoleMatchScore(candidate, role);
    });

    return Math.round((totalScore / maxScore) * 100);
  }

  /**
   * Calculate match score for a single role (0-100)
   */
  private calculateRoleMatchScore(candidate: any, role: any): number {
    let roleScore = 0;

    // Use totalExperience (preferred) or fall back to experience field
    const candidateExperience = candidate.totalExperience ?? candidate.experience;

    // Experience scoring (40 points)
    // First, prefer role-catalog specific work experience (if candidate has workExperiences matching role.roleCatalogId)
    const hasRoleSpecificWorkExp = Array.isArray(candidate.workExperiences)
      && role.roleCatalogId
      && candidate.workExperiences.some((we: any) => we.roleCatalogId === role.roleCatalogId);

    if (hasRoleSpecificWorkExp) {
      roleScore += 40;
    } else if (
      candidateExperience &&
      this.matchExperience(candidateExperience, role.minExperience, role.maxExperience)
    ) {
      roleScore += 40;
    }

    // Skills scoring (30 points)
    if (this.matchSkills(candidate.skills, role.skills)) {
      roleScore += 30;
    }

    // Education scoring (30 points) - more accurate: full points for matching qualification id/level/field;
    // partial points if candidate has qualifications but doesn't match exactly.
    roleScore += this.calculateEducationScore(candidate.qualifications, role.educationRequirementsList);

    // Ensure value is between 0 and 100
    return Math.min(100, Math.max(0, Math.round(roleScore)));
  }

  /**
   * Calculate education score for a role (0-30)
   * - If role has no education requirements, award full points (30)
   * - If candidate has any qualification that matches requirement by id/level/field -> 30
   * - If candidate has qualifications but none match -> partial (15)
   */
  private calculateEducationScore(candidateQualifications: any[] | undefined, roleEducationReqs: any[] | undefined): number {
    const MAX = 30;

    // No requirement -> full points
    if (!roleEducationReqs || roleEducationReqs.length === 0) return MAX;

    if (!candidateQualifications || candidateQualifications.length === 0) return 0;

    // Normalize candidate qualifications to inner qualification object
    const candidateQuals = candidateQualifications
      .map((cq) => cq?.qualification ?? cq)
      .filter(Boolean);

    for (const req of roleEducationReqs) {
      const reqQual = req?.qualification ?? req;
      if (!reqQual) continue;

      // Match by ID
      if (reqQual.id && candidateQuals.some((cq) => cq.id === reqQual.id)) {
        return MAX;
      }

      // Match by level
      if (reqQual.level && candidateQuals.some((cq) => cq.level === reqQual.level)) {
        return MAX;
      }

      // Match by field (case-insensitive contains)
      if (
        reqQual.field &&
        candidateQuals.some((cq) =>
          String(cq.field ?? '').toLowerCase().includes(String(reqQual.field).toLowerCase()),
        )
      ) {
        return MAX;
      }
    }

    // Candidate has qualifications but none match -> partial credit
    return Math.round(MAX / 2);
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
    const verificationStatus =
      await this.prisma.candidateProjectStatus.findFirst({
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
      throw new BadRequestException(
        'Documents verified status not found in system',
      );
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
