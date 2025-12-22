import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { RoundRobinService } from '../round-robin/round-robin.service';
import { CandidateAllocationService } from '../candidate-allocation/candidate-allocation.service';
import { CandidateMatchingService } from '../candidate-matching/candidate-matching.service';
import { RecruiterPoolService } from '../recruiter-pool/recruiter-pool.service';
import { OutboxService } from '../notifications/outbox.service';
import { UnifiedEligibilityService } from '../candidate-eligibility/unified-eligibility.service';
import { PrismaService } from '../database/prisma.service';
import { PipelineService } from './pipeline.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { QueryCandidatesDto } from './dto/query-candidates.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
import { NominateCandidateDto } from './dto/nominate-candidate.dto';
import { ApproveCandidateDto } from './dto/approve-candidate.dto';
import { SendForVerificationDto } from './dto/send-for-verification.dto';
import { UpdateCandidateStatusDto } from './dto/update-candidate-status.dto';
import { AssignRecruiterDto } from './dto/assign-recruiter.dto';
import { RecruiterAssignmentService } from './services/recruiter-assignment.service';
import { RnrRemindersService } from '../rnr-reminders/rnr-reminders.service';
import {
  CandidateWithRelations,
  PaginatedCandidates,
  CandidateStats,
} from './types';
import {
  CANDIDATE_PROJECT_STATUS,
  CANDIDATE_STATUS,
  canTransitionStatus,
  requiresCREHandling,
  isCandidateStatusTerminal,
} from '../common/constants';

@Injectable()
export class CandidatesService {
  private readonly logger = new Logger(CandidatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly pipelineService: PipelineService,
    private readonly eligibilityService: UnifiedEligibilityService,
    private readonly recruiterAssignmentService: RecruiterAssignmentService,
    private readonly rnrRemindersService: RnrRemindersService,
  ) { }

  /**
   * Calculate total experience in years from work experiences
   * Considers overlapping periods and current jobs
   */
  private calculateTotalExperience(workExperiences?: any[]): number {
    if (!workExperiences || workExperiences.length === 0) {
      return 0;
    }

    // Create date ranges for each experience
    const dateRanges = workExperiences.map((exp) => {
      const startDate = new Date(exp.startDate);
      const endDate = exp.endDate ? new Date(exp.endDate) : new Date();
      return { startDate, endDate };
    });

    // Sort by start date
    dateRanges.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    // Merge overlapping date ranges
    const mergedRanges: Array<{ startDate: Date; endDate: Date }> = [];
    let currentRange = dateRanges[0];

    for (let i = 1; i < dateRanges.length; i++) {
      const nextRange = dateRanges[i];

      // Check if ranges overlap or are adjacent
      if (nextRange.startDate <= currentRange.endDate) {
        // Merge: extend current range to max end date
        currentRange.endDate = new Date(
          Math.max(currentRange.endDate.getTime(), nextRange.endDate.getTime())
        );
      } else {
        // No overlap: save current range and start new one
        mergedRanges.push(currentRange);
        currentRange = nextRange;
      }
    }
    mergedRanges.push(currentRange);

    // Calculate total years from merged ranges
    const totalMonths = mergedRanges.reduce((total, range) => {
      const months =
        (range.endDate.getFullYear() - range.startDate.getFullYear()) * 12 +
        (range.endDate.getMonth() - range.startDate.getMonth());
      return total + months;
    }, 0);

    // Convert to years (rounded to 1 decimal place)
    return Math.round((totalMonths / 12) * 10) / 10;
  }

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

    // Log work experiences for debugging
    this.logger.log(`Creating candidate with ${createCandidateDto.workExperiences?.length || 0} work experiences`);
    if (createCandidateDto.workExperiences && createCandidateDto.workExperiences.length > 0) {
      this.logger.log(`Work experiences data: ${JSON.stringify(createCandidateDto.workExperiences)}`);
    }

    // Validate provided roleCatalogIds in work experiences (if any)
    if (createCandidateDto.workExperiences && createCandidateDto.workExperiences.length > 0) {
      const roleCatalogIds = Array.from(new Set(
        createCandidateDto.workExperiences
          .map((we) => we.roleCatalogId)
          .filter((id): id is string => id !== undefined && id !== null)
      ));
      
      if (roleCatalogIds.length > 0) {
        const existingRoleCatalogs = await this.prisma.roleCatalog.findMany({
          where: { id: { in: roleCatalogIds } },
          select: { id: true },
        });
        const existingIds = existingRoleCatalogs.map((r) => r.id);
        const missing = roleCatalogIds.filter((id) => !existingIds.includes(id));
        if (missing.length > 0) {
          throw new NotFoundException(
            `RoleCatalog(s) not found: ${missing.join(', ')}`,
          );
        }
      }
    }

    // Calculate total experience from work experiences if provided
    const calculatedExperience = createCandidateDto.workExperiences && createCandidateDto.workExperiences.length > 0
      ? this.calculateTotalExperience(createCandidateDto.workExperiences)
      : 0;

    // Use provided totalExperience or calculated value
    const totalExperience = createCandidateDto.totalExperience ?? calculatedExperience;

    this.logger.log(`Calculated experience: ${calculatedExperience}, Final totalExperience: ${totalExperience}`);

    // Get the default status info for history tracking
    const defaultStatusId = createCandidateDto.currentStatusId ?? 1;
    const defaultStatus = await this.prisma.candidateStatus.findUnique({
      where: { id: defaultStatusId },
      select: { statusName: true },
    });

    // Get user info for status history
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

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
        currentStatusId: defaultStatusId,
        totalExperience: totalExperience,
        currentSalary: createCandidateDto.currentSalary,
        currentEmployer: createCandidateDto.currentEmployer,
        currentRole: createCandidateDto.currentRole,
        expectedSalary: createCandidateDto.expectedSalary,
        highestEducation: createCandidateDto.highestEducation,
        university: createCandidateDto.university,
        graduationYear: createCandidateDto.graduationYear,
        gpa: createCandidateDto.gpa,
        // Legacy fields for backward compatibility
        experience: totalExperience,
        skills: createCandidateDto.skills
          ? JSON.parse(createCandidateDto.skills)
          : [],
        // Note: assignedTo field has been removed - all assignments tracked via CandidateProjects
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
            create: createCandidateDto.workExperiences.map((exp) => {
              // Handle skills - it might be a JSON string or already parsed
              let parsedSkills = [];
              if (exp.skills) {
                try {
                  parsedSkills = typeof exp.skills === 'string'
                    ? JSON.parse(exp.skills)
                    : exp.skills;
                } catch (error) {
                  this.logger.warn(`Failed to parse skills for work experience: ${error.message}`);
                  parsedSkills = [];
                }
              }

              return {
                roleCatalogId: exp.roleCatalogId,
                companyName: exp.companyName,
                jobTitle: exp.jobTitle,
                startDate: new Date(exp.startDate),
                endDate: exp.endDate ? new Date(exp.endDate) : null,
                isCurrent: exp.isCurrent ?? false,
                description: exp.description,
                salary: exp.salary,
                location: exp.location,
                skills: parsedSkills,
                achievements: exp.achievements,
              };
            }),
          }
          : undefined,
      },
      include: {
        // recruiter relation removed - now accessed via projects
        team: true,
        workExperiences: {
          include: {
            roleCatalog: true,
          },
        },
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

    // Create initial status history entry
    try {
      await this.prisma.candidateStatusHistory.create({
        data: {
          candidateId: candidate.id,
          statusId: defaultStatusId,
          statusNameSnapshot: defaultStatus?.statusName || 'Untouched',
          changedById: userId,
          changedByName: user?.name || 'System',
          reason: 'Initial candidate creation',
          notificationCount: 0,
          statusUpdatedAt: new Date(),
        },
      });
      this.logger.log(
        `✅ Created initial status history entry for candidate ${candidate.id} with status '${defaultStatus?.statusName || 'Untouched'}'`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to create status history for candidate ${candidate.id}:`,
        error,
      );
      // Don't fail candidate creation if status history fails
    }

    // Skip auto-allocation to projects - only perform recruiter assignment
    // Project allocation should be done manually or through other workflows
    // try {
    //   await this.autoAllocateCandidateToProjects(candidate.id);
    // } catch (error) {
    //   console.error('Auto-allocation failed for candidate:', candidate.id, error);
    // }

    // Assign recruiter to candidate
    // If creator is a recruiter, they will be assigned directly
    // Otherwise, round-robin assignment (least workload) will be used
    try {
      this.logger.log(
        `Starting recruiter assignment for candidate ${candidate.id}, created by user ${userId}`,
      );
      const assignedRecruiter = await this.recruiterAssignmentService.assignRecruiterToCandidate(
        candidate.id,
        userId,
        'Automatic assignment on candidate creation',
      );
      this.logger.log(
        `✅ Successfully assigned recruiter ${assignedRecruiter.name} (${assignedRecruiter.email}) to candidate ${candidate.id}`,
      );
    } catch (error) {
      // Log error but don't fail candidate creation
      this.logger.error(
        `❌ Failed to assign recruiter to candidate ${candidate.id}:`,
        error,
      );
    }

    return candidate;
  }

  async findAll(query: QueryCandidatesDto): Promise<PaginatedCandidates> {
    const {
      search,
      currentStatus,
      status,
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

    // Handle status alias - status is an alias for currentStatus
    const effectiveStatus = currentStatus || status;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { mobileNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (effectiveStatus) {
      // Look up status by name to get the ID
      const statusRecord = await this.prisma.candidateStatus.findFirst({
        where: {
          statusName: {
            equals: effectiveStatus,
            mode: 'insensitive',
          },
        },
      });
      if (statusRecord) {
        where.currentStatusId = statusRecord.id;
      }
    }

    if (source) {
      where.source = source;
    }

    if (teamId) {
      where.teamId = teamId;
    }

    // Note: assignedTo filtering is now handled via CandidateProjects
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

    // Handle assignedTo filter via CandidateProjects
    if (assignedTo) {
      where.projects = {
        some: {
          recruiterId: assignedTo,
        },
      };
    }

    // Calculate status counts for all candidates (not filtered by status/search)
    const baseWhere: any = {};
    if (teamId) baseWhere.teamId = teamId;
    if (assignedTo) {
      baseWhere.projects = {
        some: {
          recruiterId: assignedTo,
        },
      };
    }

    // Get all status IDs
    const untouchedStatus = await this.prisma.candidateStatus.findFirst({
      where: { statusName: { equals: 'untouched', mode: 'insensitive' } },
    });
    const rnrStatus = await this.prisma.candidateStatus.findFirst({
      where: { statusName: { equals: 'rnr', mode: 'insensitive' } },
    });
    const onHoldStatus = await this.prisma.candidateStatus.findFirst({
      where: { statusName: { equals: 'on_hold', mode: 'insensitive' } },
    });
    const interestedStatus = await this.prisma.candidateStatus.findFirst({
      where: { statusName: { equals: 'interested', mode: 'insensitive' } },
    });
    const notInterestedStatus = await this.prisma.candidateStatus.findFirst({
      where: { statusName: { equals: 'not_interested', mode: 'insensitive' } },
    });
    const otherEnquiryStatus = await this.prisma.candidateStatus.findFirst({
      where: { statusName: { equals: 'other_enquiry', mode: 'insensitive' } },
    });
    const qualifiedStatus = await this.prisma.candidateStatus.findFirst({
      where: { statusName: { equals: 'qualified', mode: 'insensitive' } },
    });
    const futureStatus = await this.prisma.candidateStatus.findFirst({
      where: { statusName: { equals: 'future', mode: 'insensitive' } },
    });
    const workingStatus = await this.prisma.candidateStatus.findFirst({
      where: { statusName: { equals: 'working', mode: 'insensitive' } },
    });

    // Get all candidates for counting
    const allCandidates = await this.prisma.candidate.findMany({
      where: baseWhere,
      select: { id: true, currentStatusId: true },
    });

    const counts = allCandidates.reduce(
      (acc, c) => {
        acc.total += 1;
        if (c.currentStatusId === untouchedStatus?.id) acc.untouched += 1;
        if (c.currentStatusId === rnrStatus?.id) acc.rnr += 1;
        if (c.currentStatusId === onHoldStatus?.id) acc.onHold += 1;
        if (c.currentStatusId === interestedStatus?.id) acc.interested += 1;
        if (c.currentStatusId === notInterestedStatus?.id) acc.notInterested += 1;
        if (c.currentStatusId === otherEnquiryStatus?.id) acc.otherEnquiry += 1;
        if (c.currentStatusId === qualifiedStatus?.id) acc.qualified += 1;
        if (c.currentStatusId === futureStatus?.id) acc.future += 1;
        if (c.currentStatusId === workingStatus?.id) acc.working += 1;
        return acc;
      },
      {
        total: 0,
        untouched: 0,
        rnr: 0,
        onHold: 0,
        interested: 0,
        notInterested: 0,
        otherEnquiry: 0,
        qualified: 0,
        future: 0,
        working: 0,
      },
    );

    // Get candidates with relations
    const candidates = await this.prisma.candidate.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        currentStatus: {
          select: {
            id: true,
            statusName: true,
          },
        },
        team: true,
        recruiterAssignments: {
          where: {
            isActive: true,
          },
          include: {
            recruiter: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            assignedAt: 'desc',
          },
        },
        // Include role catalog for each work experience
        workExperiences: {
          include: {
            roleCatalog: true,
          },
        },
        qualifications: {
          include: {
            qualification: true,
          },
        },
        projects: {
          include: {
            project: {
              select: {
                id: true,
                title: true,
                status: true,
                clientId: true,
                client: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                  },
                },
              },
            },
            roleNeeded: {
              select: {
                id: true,
                designation: true,
              },
            },

            // 🔥 NEW → MAIN STATUS (Nominated / Documents / Interview / Processing)
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

            // 🔥 NEW → SUB STATUS (pending_documents / verification / etc.)
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


            recruiter: {
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
        },
      },
    });

    // --------------------------
    // Attach isSendedForDocumentVerification flag to project mappings
    // For performance, collect all candidateProject map ids and query the
    // CandidateProjectStatusHistory table to check for any "documents"
    // main status history entries. If present, that mapping has been
    // sent for document verification at some point.
    // --------------------------
    const allCandidateProjectIds: string[] = candidates.flatMap((c) =>
      (c.projects || []).map((p) => p.id),
    );

    if (allCandidateProjectIds.length > 0) {
      const docHistories = await this.prisma.candidateProjectStatusHistory.findMany({
        where: {
          candidateProjectMapId: { in: allCandidateProjectIds },
          mainStatus: {
            name: 'documents',
          },
        },
        select: {
          candidateProjectMapId: true,
        },
      });

      const sentSet = new Set(docHistories.map((h) => h.candidateProjectMapId));

      // Mutate the returned candidates array to include the boolean flag
      candidates.forEach((candidate) => {
        if (!candidate.projects) return;
        candidate.projects = candidate.projects.map((proj) => ({
          ...proj,
          isSendedForDocumentVerification: sentSet.has(proj.id),
        }));
      });
    }

    return {
      candidates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      counts,
    };
  }

  /**
   * Get candidates assigned to a specific CRE user
   * Used for CRE dashboard to show only their assigned candidates
   */
  async getCREAssignedCandidates(
    creUserId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      currentStatus?: string;
    },
  ): Promise<{
    candidates: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page = 1, limit = 10, search, currentStatus } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      recruiterAssignments: {
        some: {
          recruiterId: creUserId,
          isActive: true, // Only active assignments
        },
      },
    };

    // Add search filter
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { mobileNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Add status filter
    if (currentStatus) {
      where.currentStatusId = parseInt(currentStatus);
    }

    // Get total count
    const total = await this.prisma.candidate.count({ where });

    // Get candidates with relations
    const candidates = await this.prisma.candidate.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' }, // Show most recently updated first
      include: {
        currentStatus: {
          select: {
            id: true,
            statusName: true,
          },
        },
        workExperiences: {
          include: {
            roleCatalog: true,
          },
        },
        qualifications: {
          include: {
            qualification: true,
          },
        },
        recruiterAssignments: {
          where: {
            recruiterId: creUserId,
            isActive: true,
          },
          include: {
            recruiter: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            assignedByUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        // Include RNR reminder info if exists
        rnrReminders: {
          where: {
            status: {
              in: ['pending', 'sent'],
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
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
        currentStatus: {
          select: {
            id: true,
            statusName: true,
          },
        },
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
            // Include recruiter information from CandidateProjects
            recruiter: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            currentProjectStatus: {
              select: {
                id: true,
                statusName: true,
              },
            },
            subStatus: {
            select: {
              label: true,  // <---- Include subStatus label here
            },
          },
          },
        },
        workExperiences: {
          include: {
            roleCatalog: true,
          },
        },
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

    // Generate pipeline data for each project
    const pipelineData = this.pipelineService.generatePipelinesForCandidate(
      candidate.projects,
    );

    // Add pipeline data to the candidate object
    return {
      ...candidate,
      pipeline: {
        projects: pipelineData,
        overallProgress: this.calculateOverallProgress(pipelineData),
      },
    } as CandidateWithRelations & {
      pipeline: {
        projects: any[];
        overallProgress: number;
      };
    };
  }

  /**
   * Calculate overall progress across all projects
   */
  private calculateOverallProgress(pipelineData: any[]): number {
    if (pipelineData.length === 0) return 0;

    const totalProgress = pipelineData.reduce(
      (sum, project) => sum + project.overallProgress,
      0,
    );
    return Math.round(totalProgress / pipelineData.length);
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
    if (updateCandidateDto.currentStatusId !== undefined)
      updateData.currentStatusId = updateCandidateDto.currentStatusId;
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
        workExperiences: {
          include: {
            roleCatalog: true,
          },
        },
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
    const existingAssignment = await this.prisma.candidateProjects.findFirst({
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
    const assignment = await this.prisma.candidateProjects.create({
      data: {
        candidateId,
        projectId: assignProjectDto.projectId,
        notes: assignProjectDto.notes,
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
    const candidateMatchingService = new CandidateMatchingService(
      this.prisma,
      this.eligibilityService,
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

    // Get all global recruiters (not project-specific)
    const recruiters = await this.getAllRecruiters();

    if (recruiters.length === 0) {
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
            await this.prisma.candidateProjects.findUnique({
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
   * Check if a candidate is eligible for a specific role using unified eligibility engine
   */
  private async checkCandidateEligibility(
    candidate: any,
    role: any,
  ): Promise<boolean> {
    try {
      const eligibilityResult = await this.eligibilityService.checkEligibility({
        candidateId: candidate.id,
        roleNeededId: role.id,
        projectId: role.projectId,
      });

      return eligibilityResult.isEligible;
    } catch (error) {
      this.logger.error(
        `Error checking eligibility for candidate ${candidate.id} and role ${role.id}:`,
        error.stack,
      );

      // Fallback to basic check if eligibility service fails
      return this.basicEligibilityCheck(candidate, role);
    }
  }

  /**
   * Basic eligibility check as fallback
   */
  private basicEligibilityCheck(candidate: any, role: any): boolean {
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
            candidateProjectMaps: true,
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

  async getCandidateProjects(candidateId: string): Promise<any[]> {
    // Check if candidate exists
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    // Get all projects assigned to the candidate
    const assignments = await this.prisma.candidateProjects.findMany({
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
      orderBy: { createdAt: 'desc' },
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
      this.prisma.candidate.count({ where: { currentStatusId: 1 } }),
      this.prisma.candidate.count({ where: { currentStatusId: 2 } }),
      this.prisma.candidate.count({ where: { currentStatusId: 3 } }),
      this.prisma.candidate.count({ where: { currentStatusId: 4 } }),
      this.prisma.candidate.count({ where: { currentStatusId: 5 } }),
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
    const existingNomination = await this.prisma.candidateProjects.findFirst({
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
    const nomination = await this.prisma.candidateProjects.create({
      data: {
        candidateId,
        projectId: nominateDto.projectId,
        currentProjectStatusId: 1, // NOMINATED status
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
      const pendingDocsStatus = await this.prisma.candidateProjectStatus.findFirst({
        where: { statusName: 'pending_documents' },
      });
      if (pendingDocsStatus) {
        await this.prisma.candidateProjects.update({
          where: { id: nomination.id },
          data: {
            currentProjectStatusId: pendingDocsStatus.id,
          },
        });
      }
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
      await this.prisma.candidateProjects.findUnique({
        where: { id: candidateProjectMapId },
        include: {
          candidate: true,
          project: {
            include: {
              documentRequirements: true,
            },
          },
          documentVerifications: true,
          currentProjectStatus: true,
        },
      });

    if (!candidateProjectMap) {
      throw new NotFoundException(
        `Candidate project mapping with ID ${candidateProjectMapId} not found`,
      );
    }

    // Validate current status allows approval/rejection
    if (
      candidateProjectMap.currentProjectStatus.statusName !== 'documents_verified' &&
      approveDto.action === 'approve'
    ) {
      throw new BadRequestException(
        `Cannot approve candidate. Current status is ${candidateProjectMap.currentProjectStatus.statusName}. Documents must be verified first.`,
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

    // Get new status
    const newStatusName = approveDto.action === 'approve' ? 'approved' : 'rejected_documents';
    const newStatus = await this.prisma.candidateProjectStatus.findFirst({
      where: { statusName: newStatusName },
    });

    if (!newStatus) {
      throw new BadRequestException(`Status '${newStatusName}' not found`);
    }

    // Update candidateProjectMap with new status
    const updated = await this.prisma.candidateProjects.update({
      where: { id: candidateProjectMapId },
      data: {
        currentProjectStatusId: newStatus.id,
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
      await this.prisma.candidateProjects.findUnique({
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
          currentProjectStatus: true,
        },
      });

    if (!candidateProjectMap) {
      throw new NotFoundException(
        `Candidate project mapping with ID ${sendForVerificationDto.candidateProjectMapId} not found`,
      );
    }

    // Check if candidate is in correct status for verification
    if (candidateProjectMap.currentProjectStatus.statusName !== 'nominated') {
      throw new BadRequestException(
        `Candidate must be in 'nominated' status to send for verification. Current status: ${candidateProjectMap.currentProjectStatus.statusName}`,
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
            candidateProjectMaps: true,
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

    // Get pending documents status
    const pendingDocsStatus = await this.prisma.candidateProjectStatus.findFirst({
      where: { statusName: 'pending_documents' },
    });

    // Update candidate project status to pending documents
    if (pendingDocsStatus) {
      await this.prisma.candidateProjects.update({
        where: { id: sendForVerificationDto.candidateProjectMapId },
        data: {
          currentProjectStatusId: pendingDocsStatus.id,
          notes: sendForVerificationDto.notes,
        },
      });
    }

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

  /**
   * Update candidate status
   */
  async updateStatus(
    candidateId: string,
    updateStatusDto: UpdateCandidateStatusDto,
    userId: string,
  ): Promise<{ message: string; candidate: any }> {
    // Check if candidate exists
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    // Find the new status info (to get its name for snapshot)
    const status = await this.prisma.candidateStatus.findUnique({
      where: { id: updateStatusDto.currentStatusId },
    });

    if (!status) {
      throw new NotFoundException(`Candidate status ${updateStatusDto.currentStatusId} not found`);
    }

    //Get the user (who’s changing the status)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });



    // Update candidate status
    const updatedCandidate = await this.prisma.candidate.update({
      where: { id: candidateId },
      data: {
        currentStatusId: updateStatusDto.currentStatusId,
        updatedAt: new Date(),
      },
      include: {
        recruiterAssignments: {
          where: { isActive: true },
          include: {
            recruiter: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { assignedAt: 'desc' },
          take: 1,
        },
      },
    });

    // update candidate status history
    const statusHistory = await this.prisma.candidateStatusHistory.create({
      data: {
        candidateId: candidateId,
        changedById: user?.id,
        changedByName: user?.name ?? "System", // fallback if user null
        statusId: status.id,
        statusNameSnapshot: status.statusName, // snapshot for history
        statusUpdatedAt: new Date(),
        notificationCount: 0,
        reason: updateStatusDto.reason, // Save reason for status change
      },
    });

    // ===== RNR REMINDER LOGIC START =====
    // If status is changing TO RNR (statusId = 8), create a reminder
    if (updateStatusDto.currentStatusId === 8) {
      this.logger.log(
        `Candidate ${candidateId} status changed to RNR. Creating reminder...`,
      );

      try {
        await this.rnrRemindersService.createRNRReminder(
          candidateId,
          userId, // The recruiter who marked as RNR
          statusHistory.id, // Link to the status history record
        );
        this.logger.log(
          `RNR reminder created for candidate ${candidateId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to create RNR reminder for candidate ${candidateId}:`,
          error,
        );
      }
    }

    // If status is changing FROM RNR to something else, cancel pending reminders
    if (candidate.currentStatusId === 8 && updateStatusDto.currentStatusId !== 8) {
      this.logger.log(
        `Candidate ${candidateId} status changed from RNR. Cancelling reminders...`,
      );

      try {
        await this.rnrRemindersService.cancelRNRReminders(candidateId);
        this.logger.log(
          `RNR reminders cancelled for candidate ${candidateId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to cancel RNR reminders for candidate ${candidateId}:`,
          error,
        );
      }
    }
    // ===== RNR REMINDER LOGIC END =====

    // Check if status requires CRE handling
    if (requiresCREHandling(updateStatusDto.currentStatusId as any)) {
      this.logger.log(
        `Candidate ${candidateId} status changed to ${updateStatusDto.currentStatusId} - requires CRE handling`,
      );

      // Assign CRE to handle RNR candidates
      try {
        await this.recruiterAssignmentService.assignCREToCandidate(
          candidateId,
          userId,
          `Status changed to ${updateStatusDto.currentStatusId} - CRE assignment required`,
        );
        this.logger.log(
          `Assigned CRE to candidate ${candidateId} for RNR handling`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to assign CRE to candidate ${candidateId}:`,
          error,
        );
      }
    }

    // Publish status change event
    await this.outboxService.publishEvent('CandidateStatusUpdated', {
      candidateId,
      oldStatus: candidate.currentStatusId,
      newStatus: updateStatusDto.currentStatusId,
      updatedBy: userId,
      reason: updateStatusDto.reason,
    });

    return {
      message: `Candidate status updated to ${updateStatusDto.currentStatusId}`,
      candidate: updatedCandidate,
    };
  };



  /**
   * Assign recruiter to candidate
   */
  async assignRecruiter(
    candidateId: string,
    assignRecruiterDto: AssignRecruiterDto,
    userId: string,
  ): Promise<{ message: string; assignment: any }> {
    // Check if candidate exists
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    // Check if recruiter exists
    const recruiter = await this.prisma.user.findUnique({
      where: { id: assignRecruiterDto.recruiterId },
    });

    if (!recruiter) {
      throw new NotFoundException(
        `Recruiter with ID ${assignRecruiterDto.recruiterId} not found`,
      );
    }

    // Deactivate any existing active assignments
    await this.prisma.candidateRecruiterAssignment.updateMany({
      where: {
        candidateId,
        isActive: true,
      },
      data: {
        isActive: false,
        unassignedAt: new Date(),
        unassignedBy: userId,
      },
    });

    // Create new assignment
    const assignment = await this.prisma.candidateRecruiterAssignment.create({
      data: {
        candidateId,
        recruiterId: assignRecruiterDto.recruiterId,
        assignedBy: userId,
        reason: assignRecruiterDto.reason,
      },
      include: {
        recruiter: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Publish assignment event
    await this.outboxService.publishEvent('CandidateRecruiterAssigned', {
      candidateId,
      recruiterId: assignRecruiterDto.recruiterId,
      assignedBy: userId,
      reason: assignRecruiterDto.reason,
    });

    return {
      message: `Recruiter ${recruiter.name} assigned to candidate`,
      assignment,
    };
  }

  /**
   * Get candidate's current recruiter assignment
   */
  async getCurrentRecruiterAssignment(candidateId: string): Promise<any> {
    const assignment = await this.prisma.candidateRecruiterAssignment.findFirst(
      {
        where: {
          candidateId,
          isActive: true,
        },
        include: {
          recruiter: {
            select: { id: true, name: true, email: true },
          },
          assignedByUser: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { assignedAt: 'desc' },
      },
    );

    return assignment;
  }

  /**
   * Get candidate's recruiter assignment history
   */
  async getRecruiterAssignmentHistory(candidateId: string): Promise<any[]> {
    const assignments = await this.prisma.candidateRecruiterAssignment.findMany(
      {
        where: { candidateId },
        include: {
          recruiter: {
            select: { id: true, name: true, email: true },
          },
          assignedByUser: {
            select: { id: true, name: true, email: true },
          },
          unassignedByUser: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { assignedAt: 'desc' },
      },
    );

    return assignments;
  }

  /**
   * Get candidate-project mapping details by candidateId and projectId
   */
  async getCandidateProjectMapping(candidateId: string, projectId: string): Promise<any> {
    const mapping = await this.prisma.candidateProjects.findFirst({
      where: {
        candidateId,
        projectId,
      },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            mobileNumber: true,
            countryCode: true,
            currentStatus: true,
            team: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
            status: true,
            client: true,
            team: true,
          },
        },
        recruiter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        currentProjectStatus: {
          select: {
            id: true,
            statusName: true,
          },
        },
      },
    });
    return mapping;
  }
}
