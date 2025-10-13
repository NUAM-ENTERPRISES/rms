import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
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
import { OutboxService } from '../notifications/outbox.service';

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
    // Check if contact already exists (unique constraint)
    const existingCandidate = await this.prisma.candidate.findUnique({
      where: { contact: createCandidateDto.contact },
    });
    if (existingCandidate) {
      throw new ConflictException(
        `Candidate with contact ${createCandidateDto.contact} already exists`,
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

    // Create candidate
    const candidate = await this.prisma.candidate.create({
      data: {
        firstName: createCandidateDto.firstName,
        lastName: createCandidateDto.lastName,
        contact: createCandidateDto.contact,
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
        assignedTo: userId, // Assign to the creating user
        teamId: createCandidateDto.teamId,
      },
      include: {
        recruiter: true,
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
          },
        },
      },
    });

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

    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

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

    // Get candidates with relations
    const candidates = await this.prisma.candidate.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        recruiter: true,
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
        recruiter: true,
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

    // Check if contact is being updated and if it already exists
    if (
      updateCandidateDto.contact &&
      updateCandidateDto.contact !== existingCandidate.contact
    ) {
      const candidateWithContact = await this.prisma.candidate.findUnique({
        where: { contact: updateCandidateDto.contact },
      });
      if (candidateWithContact) {
        throw new ConflictException(
          `Candidate with contact ${updateCandidateDto.contact} already exists`,
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
    if (updateCandidateDto.contact)
      updateData.contact = updateCandidateDto.contact;
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
        recruiter: true,
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

    // Create assignment (nomination)
    const assignment = await this.prisma.candidateProjectMap.create({
      data: {
        candidateId,
        projectId: assignProjectDto.projectId,
        nominatedBy: assignProjectDto.notes || '', // TODO: Get from request user
        notes: assignProjectDto.notes,
        status: 'nominated', // Initial status
      },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            contact: true,
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
            contact: true,
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
            assignedCandidates: {
              where: {
                currentStatus: {
                  in: ['new', 'shortlisted', 'active'],
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
      const prevTaskCount = prev._count.assignedCandidates;
      const currentTaskCount = current._count.assignedCandidates;
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
