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
import { PrismaService } from '../database/prisma.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { QueryCandidatesDto } from './dto/query-candidates.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
import { NominateCandidateDto } from './dto/nominate-candidate.dto';
import { ApproveCandidateDto } from './dto/approve-candidate.dto';
import { SendForVerificationDto } from './dto/send-for-verification.dto';
import {
  CandidateWithRelations,
  PaginatedCandidates,
  CandidateStats,
} from './types';
import {
  CANDIDATE_PROJECT_STATUS,
  canTransitionStatus,
} from '../common/constants';

@Injectable()
export class CandidatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
  ) {}

  async create(
    createCandidateDto: CreateCandidateDto,
    userId: string,
  ): Promise<CandidateWithRelations> {
    // Check if countryCode and mobileNumber combination already exists (unique constraint)
    const existingCandidate = await this.prisma.candidate.findUnique({
      where: {
        countryCode_mobileNumber: {
          countryCode: createCandidateDto.countryCode,
          mobileNumber: createCandidateDto.mobileNumber,
        },
      },
    });
    if (existingCandidate) {
      throw new ConflictException(
        `Candidate with contact ${createCandidateDto.countryCode}${createCandidateDto.mobileNumber} already exists`,
      );
    }

    // Validate team exists if provided
    if (createCandidateDto.teamId) {
      const team = await this.prisma.team.findUnique({
        where: { id: createCandidateDto.teamId },
      });
      if (!team) {
        throw new NotFoundException(
          `Team with ID ${createCandidateDto.teamId} not found`,
        );
      }
    }

    // Validate date of birth is in the past if provided
    if (createCandidateDto.dateOfBirth) {
      const dateOfBirth = new Date(createCandidateDto.dateOfBirth);
      if (dateOfBirth >= new Date()) {
        throw new BadRequestException('Date of birth must be in the past');
      }
    }

    // Create candidate with qualifications
    const candidate = await this.prisma.candidate.create({
      data: {
        firstName: createCandidateDto.firstName,
        lastName: createCandidateDto.lastName,
        countryCode: createCandidateDto.countryCode,
        mobileNumber: createCandidateDto.mobileNumber,
        email: createCandidateDto.email,
        profileImage: createCandidateDto.profileImage,
        source: createCandidateDto.source || 'manual',
        dateOfBirth: new Date(createCandidateDto.dateOfBirth), // Now mandatory
        currentStatus: createCandidateDto.currentStatus || 'new',
        totalExperience: createCandidateDto.totalExperience,
        currentSalary: createCandidateDto.currentSalary,
        currentEmployer: createCandidateDto.currentEmployer,
        currentRole: createCandidateDto.currentRole,
        expectedSalary: createCandidateDto.expectedSalary,
        highestEducation: createCandidateDto.highestEducation,
        university: createCandidateDto.university,
        graduationYear: createCandidateDto.graduationYear,
        gpa: createCandidateDto.gpa,
        // Legacy fields for backward compatibility
        experience: createCandidateDto.totalExperience,
        skills: createCandidateDto.skills
          ? JSON.parse(createCandidateDto.skills)
          : [],
        // Note: assignedTo field has been removed - all assignments tracked via CandidateProjectMap
        teamId: createCandidateDto.teamId,
        // Handle multiple qualifications
        qualifications: createCandidateDto.qualifications
          ? {
              create: createCandidateDto.qualifications.map((qual) => ({
                qualificationId: qual.qualificationId,
                university: qual.university,
                graduationYear: qual.graduationYear,
                gpa: qual.gpa,
                isCompleted: qual.isCompleted ?? true,
                notes: qual.notes,
              })),
            }
          : undefined,
        // Handle work experiences
        workExperiences: createCandidateDto.workExperiences
          ? {
              create: createCandidateDto.workExperiences.map((exp) => ({
                companyName: exp.companyName,
                jobTitle: exp.jobTitle,
                startDate: new Date(exp.startDate),
                endDate: exp.endDate ? new Date(exp.endDate) : null,
                isCurrent: exp.isCurrent ?? false,
                description: exp.description,
                salary: exp.salary,
                location: exp.location,
                skills: exp.skills ? JSON.parse(exp.skills) : [],
                achievements: exp.achievements,
              })),
            }
          : undefined,
      },
      include: {
        // recruiter relation removed - now accessed via projects
        team: true,
        workExperiences: true,
        qualifications: {
          include: {
            qualification: true,
          },
        },
        projects: {
          include: {
            project: {
              include: {
                client: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Auto-allocate new candidate to active projects (only to recruiters)
    try {
      await this.autoAllocateCandidateToProjects(candidate.id);
    } catch (error) {
      // Log error but don't fail candidate creation
      console.error(
        'Auto-allocation failed for candidate:',
        candidate.id,
        error,
      );
    }

    return candidate;
  }

  async findAll(query: QueryCandidatesDto): Promise<PaginatedCandidates> {
    const {
      search,
      currentStatus,
      source,
      teamId,
      assignedTo,
      minExperience,
      maxExperience,
      minSalary,
      maxSalary,
      dateOfBirthFrom,
      dateOfBirthTo,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contact: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (currentStatus) {
      where.currentStatus = currentStatus;
    }

    if (source) {
      where.source = source;
    }

    if (teamId) {
      where.teamId = teamId;
    }

    // Note: assignedTo filtering is now handled via CandidateProjectMap
    // This will be implemented in the query logic below

    if (minExperience !== undefined || maxExperience !== undefined) {
      where.experience = {};
      if (minExperience !== undefined) {
        where.experience.gte = minExperience;
      }
      if (maxExperience !== undefined) {
        where.experience.lte = maxExperience;
      }
    }

    if (minSalary !== undefined || maxSalary !== undefined) {
      where.expectedSalary = {};
      if (minSalary !== undefined) {
        where.expectedSalary.gte = minSalary;
      }
      if (maxSalary !== undefined) {
        where.expectedSalary.lte = maxSalary;
      }
    }

    if (dateOfBirthFrom || dateOfBirthTo) {
      where.dateOfBirth = {};
      if (dateOfBirthFrom) {
        where.dateOfBirth.gte = new Date(dateOfBirthFrom);
      }
      if (dateOfBirthTo) {
        where.dateOfBirth.lte = new Date(dateOfBirthTo);
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const total = await this.prisma.candidate.count({ where });

    // Handle assignedTo filter via CandidateProjectMap
    if (assignedTo) {
      where.projects = {
        some: {
          recruiterId: assignedTo,
        },
      };
    }

    // Get candidates with relations
    const candidates = await this.prisma.candidate.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        team: true,
        workExperiences: true,
        qualifications: {
          include: {
            qualification: true,
          },
        },
        projects: {
          include: {
            project: {
              include: {
                client: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                  },
                },
              },
            },
            // Include recruiter information from CandidateProjectMap
            recruiter: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return {
      candidates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<CandidateWithRelations> {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id },
      include: {
        team: true,
        projects: {
          include: {
            project: {
              include: {
                client: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                  },
                },
              },
            },
            // Include recruiter information from CandidateProjectMap
            recruiter: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        workExperiences: true,
        qualifications: {
          include: {
            qualification: true,
          },
        },
      },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }

    return candidate;
  }

  async update(
    id: string,
    updateCandidateDto: UpdateCandidateDto,
    userId: string,
  ): Promise<CandidateWithRelations> {
    // Check if candidate exists
    const existingCandidate = await this.prisma.candidate.findUnique({
      where: { id },
    });
    if (!existingCandidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }

    // Check if countryCode and mobileNumber combination is being updated and if it already exists
    if (
      (updateCandidateDto.countryCode || updateCandidateDto.mobileNumber) &&
      (updateCandidateDto.countryCode !== existingCandidate.countryCode ||
        updateCandidateDto.mobileNumber !== existingCandidate.mobileNumber)
    ) {
      const countryCode =
        updateCandidateDto.countryCode || existingCandidate.countryCode;
      const mobileNumber =
        updateCandidateDto.mobileNumber || existingCandidate.mobileNumber;

      const candidateWithContact = await this.prisma.candidate.findUnique({
        where: {
          countryCode_mobileNumber: {
            countryCode,
            mobileNumber,
          },
        },
      });
      if (candidateWithContact && candidateWithContact.id !== id) {
        throw new ConflictException(
          `Candidate with contact ${countryCode}${mobileNumber} already exists`,
        );
      }
    }

    // Validate team exists if updating
    if (updateCandidateDto.teamId) {
      const team = await this.prisma.team.findUnique({
        where: { id: updateCandidateDto.teamId },
      });
      if (!team) {
        throw new NotFoundException(
          `Team with ID ${updateCandidateDto.teamId} not found`,
        );
      }
    }

    // Validate date of birth is in the past if updating
    if (updateCandidateDto.dateOfBirth) {
      const dateOfBirth = new Date(updateCandidateDto.dateOfBirth);
      if (dateOfBirth >= new Date()) {
        throw new BadRequestException('Date of birth must be in the past');
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (updateCandidateDto.firstName)
      updateData.firstName = updateCandidateDto.firstName;
    if (updateCandidateDto.lastName)
      updateData.lastName = updateCandidateDto.lastName;
    if (updateCandidateDto.countryCode)
      updateData.countryCode = updateCandidateDto.countryCode;
    if (updateCandidateDto.mobileNumber)
      updateData.mobileNumber = updateCandidateDto.mobileNumber;
    if (updateCandidateDto.email !== undefined)
      updateData.email = updateCandidateDto.email;
    if (updateCandidateDto.profileImage !== undefined)
      updateData.profileImage = updateCandidateDto.profileImage;
    if (updateCandidateDto.source)
      updateData.source = updateCandidateDto.source;
    if (updateCandidateDto.dateOfBirth)
      updateData.dateOfBirth = new Date(updateCandidateDto.dateOfBirth);
    if (updateCandidateDto.currentStatus)
      updateData.currentStatus = updateCandidateDto.currentStatus;
    if (updateCandidateDto.totalExperience !== undefined)
      updateData.totalExperience = updateCandidateDto.totalExperience;
    if (updateCandidateDto.currentSalary !== undefined)
      updateData.currentSalary = updateCandidateDto.currentSalary;
    if (updateCandidateDto.currentEmployer)
      updateData.currentEmployer = updateCandidateDto.currentEmployer;
    if (updateCandidateDto.currentRole)
      updateData.currentRole = updateCandidateDto.currentRole;
    if (updateCandidateDto.expectedSalary !== undefined)
      updateData.expectedSalary = updateCandidateDto.expectedSalary;
    if (updateCandidateDto.highestEducation)
      updateData.highestEducation = updateCandidateDto.highestEducation;
    if (updateCandidateDto.university)
      updateData.university = updateCandidateDto.university;
    if (updateCandidateDto.graduationYear !== undefined)
      updateData.graduationYear = updateCandidateDto.graduationYear;
    if (updateCandidateDto.gpa !== undefined)
      updateData.gpa = updateCandidateDto.gpa;
    if (updateCandidateDto.skills)
      updateData.skills = JSON.parse(updateCandidateDto.skills);
    if (updateCandidateDto.teamId !== undefined)
      updateData.teamId = updateCandidateDto.teamId;

    // Update candidate
    const candidate = await this.prisma.candidate.update({
      where: { id },
      data: updateData,
      include: {
        // recruiter relation removed - now accessed via projects
        team: true,
        workExperiences: true,
        qualifications: {
          include: {
            qualification: true,
          },
        },
        projects: {
          include: {
            project: {
              include: {
                client: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return candidate;
  }

  async remove(
    id: string,
    userId: string,
  ): Promise<{ id: string; message: string }> {
    // Check if candidate exists
    const candidate = await this.prisma.candidate.findUnique({
      where: { id },
      include: {
        projects: true,
      },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }

    // Check if candidate has project assignments
    if (candidate.projects.length > 0) {
      throw new ConflictException(
        `Cannot delete candidate with ID ${id} because they have project assignments. Please remove all project assignments first.`,
      );
    }

    // Delete candidate (related records will be deleted via cascade)
    await this.prisma.candidate.delete({
      where: { id },
    });

    return {
      id,
      message: 'Candidate deleted successfully',
    };
  }

  async assignProject(
    candidateId: string,
    assignProjectDto: AssignProjectDto,
    userId: string,
  ): Promise<{ message: string; assignment: any }> {
    // Check if candidate exists
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    // Check if project exists
    const project = await this.prisma.project.findUnique({
      where: { id: assignProjectDto.projectId },
    });
    if (!project) {
      throw new NotFoundException(
        `Project with ID ${assignProjectDto.projectId} not found`,
      );
    }

    // Check if assignment already exists
    const existingAssignment = await this.prisma.candidateProjectMap.findFirst({
      where: {
        candidateId,
        projectId: assignProjectDto.projectId,
      },
    });

    if (existingAssignment) {
      throw new ConflictException(
        `Candidate ${candidateId} is already assigned to project ${assignProjectDto.projectId}`,
      );
    }

    // Get next available recruiter for round-robin allocation
    const recruiters = await this.getProjectRecruiters(
      assignProjectDto.projectId,
    );
    if (recruiters.length === 0) {
      throw new BadRequestException('No recruiters available for this project');
    }

    // Use round-robin to get next recruiter
    const roundRobinService = new RoundRobinService(this.prisma);
    const recruiter = await roundRobinService.getNextRecruiter(
      assignProjectDto.projectId,
      '', // No specific role needed for manual assignment
      recruiters,
    );

    // Create assignment (nomination) with recruiter assignment
    const assignment = await this.prisma.candidateProjectMap.create({
      data: {
        candidateId,
        projectId: assignProjectDto.projectId,
        nominatedBy: userId, // Use the requesting user
        notes: assignProjectDto.notes,
        status: 'nominated', // Initial status
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
   * Auto-allocate a new candidate to active projects
   */
  private async autoAllocateCandidateToProjects(
    candidateId: string,
  ): Promise<void> {
    // Get the candidate with their details
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        qualifications: {
          include: {
            qualification: true,
          },
        },
        workExperiences: true,
      },
    });

    if (!candidate) {
      return;
    }

    // Get all active projects with roles needed
    const activeProjects = await this.prisma.project.findMany({
      where: {
        status: 'active',
        deadline: {
          gte: new Date(), // Not expired
        },
      },
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

    // Create service instances
    const candidateMatchingService = new CandidateMatchingService(this.prisma);
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

    // Get all global recruiters (not project-specific)
    const recruiters = await this.getAllRecruiters();

    if (recruiters.length === 0) {
      console.log('No recruiters found for auto-allocation');
      return;
    }

    // Check each project for eligibility
    for (const project of activeProjects) {
      if (!project.rolesNeeded || project.rolesNeeded.length === 0) {
        continue;
      }

      // Check each role for eligibility
      for (const role of project.rolesNeeded) {
        try {
          // Check if candidate is already allocated to this project-role combination
          const existingAllocation =
            await this.prisma.candidateProjectMap.findUnique({
              where: {
                candidateId_projectId_roleNeededId: {
                  candidateId,
                  projectId: project.id,
                  roleNeededId: role.id,
                },
              },
            });

          if (existingAllocation) {
            continue; // Already allocated
          }

          // Check if candidate matches role requirements
          const isEligible = await this.checkCandidateEligibility(
            candidate,
            role,
          );
          if (isEligible) {
            // Allocate candidate to this role
            await allocationService.allocateForRole(
              project.id,
              role.id,
              recruiters,
              candidateId,
            );
          }
        } catch (error) {
          console.error(
            `Failed to check eligibility for candidate ${candidateId} and role ${role.id}:`,
            error,
          );
        }
      }
    }
  }

  /**
   * Check if a candidate is eligible for a specific role
   */
  private async checkCandidateEligibility(
    candidate: any,
    role: any,
  ): Promise<boolean> {
    // Check experience requirements
    if (role.minExperience && candidate.totalExperience < role.minExperience) {
      return false;
    }
    if (role.maxExperience && candidate.totalExperience > role.maxExperience) {
      return false;
    }

    // Check education requirements
    if (role.educationRequirements && role.educationRequirements.length > 0) {
      const candidateQualifications = candidate.qualifications.map(
        (q: any) => q.qualification.name,
      );
      const hasRequiredEducation = role.educationRequirements.some(
        (req: string) => candidateQualifications.includes(req),
      );
      if (!hasRequiredEducation) {
        return false;
      }
    }

    // Check skills match
    if (role.skills && role.skills.length > 0) {
      const candidateSkills = Array.isArray(candidate.skills)
        ? candidate.skills
        : [];
      const hasRequiredSkills = role.skills.some((skill: string) =>
        candidateSkills.includes(skill),
      );
      if (!hasRequiredSkills) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate that a user is a recruiter before assignment
   */
  private async validateRecruiterAssignment(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) return false;

    const roles = user.userRoles.map((ur) => ur.role.name);
    return roles.includes('Recruiter');
  }

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
                status: {
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
          const workload = await this.prisma.candidateProjectMap.count({
            where: {
              recruiterId: user.id,
              status: {
                in: [
                  'nominated',
                  'verification_in_progress',
                  'pending_documents',
                ],
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

  async getCandidateProjects(candidateId: string): Promise<any[]> {
    // Check if candidate exists
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    // Get all projects assigned to the candidate
    const assignments = await this.prisma.candidateProjectMap.findMany({
      where: { candidateId },
      include: {
        project: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { nominatedDate: 'desc' },
    });

    return assignments;
  }

  async getCandidateStats(): Promise<CandidateStats> {
    // Get total counts
    const [
      totalCandidates,
      newCandidates,
      shortlistedCandidates,
      selectedCandidates,
      rejectedCandidates,
      hiredCandidates,
    ] = await Promise.all([
      this.prisma.candidate.count(),
      this.prisma.candidate.count({ where: { currentStatus: 'new' } }),
      this.prisma.candidate.count({ where: { currentStatus: 'shortlisted' } }),
      this.prisma.candidate.count({ where: { currentStatus: 'selected' } }),
      this.prisma.candidate.count({ where: { currentStatus: 'rejected' } }),
      this.prisma.candidate.count({ where: { currentStatus: 'hired' } }),
    ]);

    // Get candidates by status
    const candidatesByStatus = {
      new: newCandidates,
      shortlisted: shortlistedCandidates,
      selected: selectedCandidates,
      rejected: rejectedCandidates,
      hired: hiredCandidates,
    };

    // Get candidates by source
    const candidatesBySourceData = await this.prisma.candidate.groupBy({
      by: ['source'],
      _count: { source: true },
    });

    const candidatesBySource = {
      manual: 0,
      meta: 0,
      referral: 0,
    };

    candidatesBySourceData.forEach((item) => {
      if (item.source && item.source in candidatesBySource) {
        candidatesBySource[item.source as keyof typeof candidatesBySource] =
          item._count.source;
      }
    });

    // Get candidates by team
    const candidatesByTeamData = await this.prisma.candidate.groupBy({
      by: ['teamId'],
      _count: { teamId: true },
    });

    const candidatesByTeam = candidatesByTeamData.reduce(
      (acc, item) => {
        acc[item.teamId || 'unassigned'] = item._count.teamId;
        return acc;
      },
      {} as { [teamId: string]: number },
    );

    // Get average experience and salary
    const experienceStats = await this.prisma.candidate.aggregate({
      _avg: {
        experience: true,
        expectedSalary: true,
      },
      where: {
        experience: { not: null },
        expectedSalary: { not: null },
      },
    });

    return {
      totalCandidates,
      newCandidates,
      shortlistedCandidates,
      selectedCandidates,
      rejectedCandidates,
      hiredCandidates,
      candidatesByStatus,
      candidatesBySource,
      candidatesByTeam,
      averageExperience: experienceStats._avg.experience || 0,
      averageExpectedSalary: experienceStats._avg.expectedSalary || 0,
    };
  }

  /**
   * Nominate a candidate for a project
   * This is the NEW workflow entry point
   */
  async nominateCandidate(
    candidateId: string,
    nominateDto: NominateCandidateDto,
    nominatorId: string,
  ): Promise<any> {
    // Validate candidate exists
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    // Validate project exists
    const project = await this.prisma.project.findUnique({
      where: { id: nominateDto.projectId },
      include: {
        documentRequirements: true,
      },
    });
    if (!project) {
      throw new NotFoundException(
        `Project with ID ${nominateDto.projectId} not found`,
      );
    }

    // Check if already nominated
    const existingNomination = await this.prisma.candidateProjectMap.findFirst({
      where: {
        candidateId,
        projectId: nominateDto.projectId,
      },
    });
    if (existingNomination) {
      throw new ConflictException(
        `Candidate ${candidateId} is already nominated for project ${nominateDto.projectId}`,
      );
    }

    // Create nomination
    const nomination = await this.prisma.candidateProjectMap.create({
      data: {
        candidateId,
        projectId: nominateDto.projectId,
        nominatedBy: nominatorId,
        status: CANDIDATE_PROJECT_STATUS.NOMINATED,
        notes: nominateDto.notes,
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
          },
        },
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
    });

    // Auto-transition to pending_documents if project has document requirements
    if (project.documentRequirements.length > 0) {
      await this.prisma.candidateProjectMap.update({
        where: { id: nomination.id },
        data: {
          status: CANDIDATE_PROJECT_STATUS.PENDING_DOCUMENTS,
        },
      });
    }

    return nomination;
  }

  /**
   * Approve or reject a candidate after document verification
   * Only callable by Document Verification Team
   */
  async approveOrRejectCandidate(
    candidateProjectMapId: string,
    approveDto: ApproveCandidateDto,
    approverId: string,
  ): Promise<any> {
    // Get candidateProjectMap
    const candidateProjectMap =
      await this.prisma.candidateProjectMap.findUnique({
        where: { id: candidateProjectMapId },
        include: {
          candidate: true,
          project: {
            include: {
              documentRequirements: true,
            },
          },
          documentVerifications: true,
        },
      });

    if (!candidateProjectMap) {
      throw new NotFoundException(
        `Candidate project mapping with ID ${candidateProjectMapId} not found`,
      );
    }

    // Validate current status allows approval/rejection
    if (
      candidateProjectMap.status !==
        CANDIDATE_PROJECT_STATUS.DOCUMENTS_VERIFIED &&
      approveDto.action === 'approve'
    ) {
      throw new BadRequestException(
        `Cannot approve candidate. Current status is ${candidateProjectMap.status}. Documents must be verified first.`,
      );
    }

    // If approving, verify all documents are verified
    if (approveDto.action === 'approve') {
      const totalRequired =
        candidateProjectMap.project.documentRequirements.length;
      const totalVerified = candidateProjectMap.documentVerifications.filter(
        (v) => v.status === 'verified',
      ).length;

      if (totalVerified < totalRequired) {
        throw new BadRequestException(
          `Cannot approve candidate. Only ${totalVerified} of ${totalRequired} required documents are verified.`,
        );
      }
    }

    // Update status
    const newStatus =
      approveDto.action === 'approve'
        ? CANDIDATE_PROJECT_STATUS.APPROVED
        : CANDIDATE_PROJECT_STATUS.REJECTED_DOCUMENTS;

    // Validate status transition
    if (
      !canTransitionStatus(candidateProjectMap.status as any, newStatus as any)
    ) {
      throw new BadRequestException(
        `Cannot transition from ${candidateProjectMap.status} to ${newStatus}`,
      );
    }

    // Update candidateProjectMap
    const updated = await this.prisma.candidateProjectMap.update({
      where: { id: candidateProjectMapId },
      data: {
        status: newStatus,
        approvedBy: approveDto.action === 'approve' ? approverId : undefined,
        approvedDate: approveDto.action === 'approve' ? new Date() : undefined,
        rejectedBy: approveDto.action === 'reject' ? approverId : undefined,
        rejectedDate: approveDto.action === 'reject' ? new Date() : undefined,
        rejectionReason: approveDto.rejectionReason,
        notes: approveDto.notes
          ? `${candidateProjectMap.notes || ''}\n${approveDto.notes}`.trim()
          : candidateProjectMap.notes,
      },
      include: {
        candidate: true,
        project: true,
      },
    });

    return updated;
  }

  /**
   * Get eligible candidates for a project
   * Based on project requirements and candidate skills/experience
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
        // recruiter relation removed - now accessed via CandidateProjectMap
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // TODO: Implement matching logic based on rolesNeeded requirements
    // For now, return all candidates not nominated yet
    return candidates;
  }

  /**
   * Send candidate for document verification
   * Assigns to document executive with least tasks and triggers notification
   */
  async sendForVerification(
    sendForVerificationDto: SendForVerificationDto,
    userId: string,
  ): Promise<{ message: string; assignedTo: string }> {
    // Check if candidate project mapping exists
    const candidateProjectMap =
      await this.prisma.candidateProjectMap.findUnique({
        where: { id: sendForVerificationDto.candidateProjectMapId },
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
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
      throw new NotFoundException(
        `Candidate project mapping with ID ${sendForVerificationDto.candidateProjectMapId} not found`,
      );
    }

    // Check if candidate is in correct status for verification
    if (candidateProjectMap.status !== CANDIDATE_PROJECT_STATUS.NOMINATED) {
      throw new BadRequestException(
        `Candidate must be in 'nominated' status to send for verification. Current status: ${candidateProjectMap.status}`,
      );
    }

    // Find document executive with least tasks
    const documentExecutives = await this.prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: {
                in: ['Documentation Executive', 'Processing Executive'],
              },
            },
          },
        },
      },
      include: {
        _count: {
          select: {
            // Count pending document verifications
            // This is a simplified approach - in production you'd want more sophisticated task counting
            candidateProjectMaps: {
              where: {
                status: {
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
    });

    if (documentExecutives.length === 0) {
      throw new BadRequestException('No document executives available');
    }

    // Find executive with least tasks
    const assignedExecutive = documentExecutives.reduce((prev, current) => {
      const prevTaskCount = prev._count.candidateProjectMaps;
      const currentTaskCount = current._count.candidateProjectMaps;
      return currentTaskCount < prevTaskCount ? current : prev;
    });

    // Update candidate project status to pending documents
    await this.prisma.candidateProjectMap.update({
      where: { id: sendForVerificationDto.candidateProjectMapId },
      data: {
        status: CANDIDATE_PROJECT_STATUS.PENDING_DOCUMENTS,
        notes: sendForVerificationDto.notes,
      },
    });

    // Publish event to notify document executive
    await this.outboxService.publishCandidateSentForVerification(
      sendForVerificationDto.candidateProjectMapId,
      assignedExecutive.id,
    );

    return {
      message: `Candidate ${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName} sent for verification`,
      assignedTo: assignedExecutive.name,
    };
  }
}
