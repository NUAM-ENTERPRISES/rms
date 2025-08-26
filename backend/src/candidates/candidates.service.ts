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
import {
  CandidateWithRelations,
  PaginatedCandidates,
  CandidateStats,
} from './types';

@Injectable()
export class CandidatesService {
  constructor(private readonly prisma: PrismaService) {}

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
        name: createCandidateDto.name,
        contact: createCandidateDto.contact,
        email: createCandidateDto.email,
        source: createCandidateDto.source || 'manual',
        dateOfBirth: createCandidateDto.dateOfBirth
          ? new Date(createCandidateDto.dateOfBirth)
          : null,
        currentStatus: createCandidateDto.currentStatus || 'new',
        experience: createCandidateDto.experience,
        skills: createCandidateDto.skills
          ? JSON.parse(createCandidateDto.skills)
          : [],
        currentEmployer: createCandidateDto.currentEmployer,
        expectedSalary: createCandidateDto.expectedSalary,
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
    if (updateCandidateDto.name) updateData.name = updateCandidateDto.name;
    if (updateCandidateDto.contact)
      updateData.contact = updateCandidateDto.contact;
    if (updateCandidateDto.email !== undefined)
      updateData.email = updateCandidateDto.email;
    if (updateCandidateDto.source)
      updateData.source = updateCandidateDto.source;
    if (updateCandidateDto.dateOfBirth)
      updateData.dateOfBirth = new Date(updateCandidateDto.dateOfBirth);
    if (updateCandidateDto.currentStatus)
      updateData.currentStatus = updateCandidateDto.currentStatus;
    if (updateCandidateDto.experience !== undefined)
      updateData.experience = updateCandidateDto.experience;
    if (updateCandidateDto.skills)
      updateData.skills = JSON.parse(updateCandidateDto.skills);
    if (updateCandidateDto.currentEmployer !== undefined)
      updateData.currentEmployer = updateCandidateDto.currentEmployer;
    if (updateCandidateDto.expectedSalary !== undefined)
      updateData.expectedSalary = updateCandidateDto.expectedSalary;
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
    const existingAssignment = await this.prisma.candidateProjectMap.findUnique(
      {
        where: {
          candidateId_projectId: {
            candidateId,
            projectId: assignProjectDto.projectId,
          },
        },
      },
    );

    if (existingAssignment) {
      throw new ConflictException(
        `Candidate ${candidateId} is already assigned to project ${assignProjectDto.projectId}`,
      );
    }

    // Create assignment
    const assignment = await this.prisma.candidateProjectMap.create({
      data: {
        candidateId,
        projectId: assignProjectDto.projectId,
        notes: assignProjectDto.notes,
      },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
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
      orderBy: { assignedDate: 'desc' },
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
}
