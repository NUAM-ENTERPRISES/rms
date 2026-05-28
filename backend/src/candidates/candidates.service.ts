import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { RoundRobinService } from '../round-robin/round-robin.service';
import { CandidateAllocationService } from '../candidate-allocation/candidate-allocation.service';
import { CandidateMatchingService } from '../candidate-matching/candidate-matching.service';
import { RecruiterPoolService } from '../recruiter-pool/recruiter-pool.service';
import { OutboxService } from '../notifications/outbox.service';
import { UnifiedEligibilityService } from '../candidate-eligibility/unified-eligibility.service';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PipelineService } from './pipeline.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { QueryCandidatesDto } from './dto/query-candidates.dto';
import { QueryCandidateOverviewDto } from './dto/query-candidate-overview.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
import { NominateCandidateDto } from './dto/nominate-candidate.dto';
import { ApproveCandidateDto } from './dto/approve-candidate.dto';
import { SendForVerificationDto } from './dto/send-for-verification.dto';
import { UpdateCandidateStatusDto } from './dto/update-candidate-status.dto';
import { AssignRecruiterDto } from './dto/assign-recruiter.dto';
import { TransferCandidateDto } from './dto/transfer-candidate.dto';
import { BulkTransferCandidateDto } from './dto/bulk-transfer-candidate.dto';
import { ConsolidatedCandidateQueryDto } from './dto/consolidated-candidate-query.dto';
import { RecruiterAssignmentService } from './services/recruiter-assignment.service';
import { CandidateCodeService } from './services/candidate-code.service';
import { allowedTemplateKeysForSector } from '../processing/processing-sector-steps';
import { RnrRemindersService } from '../rnr-reminders/rnr-reminders.service';
import { WhatsAppService } from '../notifications/whatsapp.service';
import { WhatsAppNotificationService } from '../notifications/whatsapp-notification.service';
import {
  CandidateWithRelations,
  PaginatedCandidates,
  CandidateStats,
} from './types';
import {
  CANDIDATE_PROJECT_STATUS,
  CANDIDATE_STATUS,
  CANDIDATE_ASSIGNMENT_TYPE,
  canTransitionStatus,
  requiresCREHandling,
  isCandidateStatusTerminal,
  normalizeCandidateSource,
} from '../common/constants';
import { ROLE_NAMES } from '../common/constants/role-ids';
import { canSeeAgentSourcedCandidates } from './candidate-visibility';
import {
  assertPhysicalAddressConsistent,
  mergePhysicalAddress,
} from '../common/address/assert-physical-address';
import {
  assertAgentCandidateLinkedToAgentProject,
  agentSourceConsolidatedCandidateWhere,
} from '../common/agent-project-candidate-scope';
import {
  computeCandidateProfileCompletion,
  withProfileCompletion,
} from './utils/profile-completion.util';
import { calculateTotalExperienceYears, calculateCareerGaps } from './utils/employment-timeline.util';
import {
  assertOptionalCountryCode,
  normalizeOptionalCountryCode,
} from '../common/country/assert-optional-country-code';

const candidateWorkExperiencesInclude = {
  include: {
    roleCatalog: true,
    country: { select: { code: true, name: true } },
  },
} as const;

const candidateQualificationsInclude = {
  include: {
    qualification: true,
    country: { select: { code: true, name: true } },
  },
} as const;

@Injectable()
export class CandidatesService {
  private readonly logger = new Logger(CandidatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly pipelineService: PipelineService,
    private readonly eligibilityService: UnifiedEligibilityService,
    private readonly recruiterAssignmentService: RecruiterAssignmentService,
    private readonly candidateCodeService: CandidateCodeService,
    private readonly rnrRemindersService: RnrRemindersService,
    private readonly whatsAppService: WhatsAppService,
    private readonly whatsappNotificationService: WhatsAppNotificationService,
  ) { }

  /**
   * Shared nomination logic for nominate API (and similar flows).
   */
  private async createProjectNominationForWorkflow(
    db: Prisma.TransactionClient,
    candidateId: string,
    link: { projectId: string; roleNeededId?: string; notes?: string },
  ) {
    if (link.roleNeededId) {
      const role = await db.roleNeeded.findFirst({
        where: { id: link.roleNeededId, projectId: link.projectId },
        select: { id: true },
      });
      if (!role) {
        throw new NotFoundException(
          `Role-needed ${link.roleNeededId} not found on project ${link.projectId}`,
        );
      }
    }

    const project = await db.project.findUnique({
      where: { id: link.projectId },
      include: { documentRequirements: true },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${link.projectId} not found`);
    }

    const existingNomination = await db.candidateProjects.findFirst({
      where: {
        candidateId,
        projectId: link.projectId,
        roleNeededId: link.roleNeededId ?? null,
      },
    });
    if (existingNomination) {
      throw new ConflictException(
        `Candidate ${candidateId} is already nominated for this project${link.roleNeededId ? ' and role slot' : ''}`,
      );
    }

    const nomination = await db.candidateProjects.create({
      data: {
        candidateId,
        projectId: link.projectId,
        roleNeededId: link.roleNeededId,
        currentProjectStatusId: 1,
        notes: link.notes,
      },
    });

    if (project.documentRequirements.length > 0) {
      const pendingDocsStatus = await db.candidateProjectStatus.findFirst({
        where: { statusName: 'pending_documents' },
      });
      if (pendingDocsStatus) {
        await db.candidateProjects.update({
          where: { id: nomination.id },
          data: { currentProjectStatusId: pendingDocsStatus.id },
        });
      }
    }

    return nomination;
  }

  /** Replace AgentCandidateDeclaredProject rows; validates each project is an active AgentProject for this agent */
  private async replaceAgentCandidateDeclaredProjects(
    tx: Prisma.TransactionClient,
    candidateId: string,
    agentId: string,
    rawProjectIds: string[],
  ): Promise<void> {
    await tx.agentCandidateDeclaredProject.deleteMany({ where: { candidateId } });
    const uniq = [...new Set((rawProjectIds || []).filter(Boolean))];
    if (!uniq.length) return;

    const links = await tx.agentProject.findMany({
      where: {
        agentId,
        isActive: true,
        projectId: { in: uniq },
      },
      select: { projectId: true },
    });
    const ok = new Set(links.map((l) => l.projectId));
    const missing = uniq.filter((id) => !ok.has(id));
    if (missing.length) {
      throw new BadRequestException(
        `Each declaredProjectId must match an active agent-project link on this agent: ${missing.join(', ')}`,
      );
    }
    await tx.agentCandidateDeclaredProject.createMany({
      data: uniq.map((projectId) => ({ candidateId, projectId })),
    });
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

    // Validate date of birth is in the past if provided (still optional)
    if (createCandidateDto.dateOfBirth) {
      const dateOfBirth = new Date(createCandidateDto.dateOfBirth);
      if (Number.isNaN(dateOfBirth.getTime())) {
        throw new BadRequestException('Date of birth must be a valid date');
      }
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

    if (createCandidateDto.qualifications?.length) {
      for (const qual of createCandidateDto.qualifications) {
        await assertOptionalCountryCode(this.prisma, qual.countryCode);
      }
    }

    if (createCandidateDto.workExperiences?.length) {
      for (const exp of createCandidateDto.workExperiences) {
        await assertOptionalCountryCode(this.prisma, exp.countryCode);
      }
    }

    // Calculate total experience from work experiences if provided
    const calculatedExperience = createCandidateDto.workExperiences && createCandidateDto.workExperiences.length > 0
      ? calculateTotalExperienceYears(createCandidateDto.workExperiences)
      : 0;

    // Use provided totalExperience or calculated value
    const totalExperience = createCandidateDto.totalExperience ?? calculatedExperience;

    this.logger.log(`Calculated experience: ${calculatedExperience}, Final totalExperience: ${totalExperience}`);

    const creatingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        userRoles: {
          include: {
            role: { select: { name: true } },
          },
        },
      },
    });

    const isAgentCoordinator = creatingUser?.userRoles.some(
      (ur) =>
        ur.role?.name?.toLowerCase() ===
        ROLE_NAMES.AGENT_COORDINATOR.toLowerCase(),
    );

    let resolvedSource =
      normalizeCandidateSource(createCandidateDto.source) ?? 'manual';
    if (isAgentCoordinator) {
      resolvedSource = 'agent';
    }

    let resolvedAgentId = createCandidateDto.agentId ?? undefined;
    if (resolvedSource === 'agent') {
      if (!resolvedAgentId) {
        throw new BadRequestException(
          'agentId is required when source is agent',
        );
      }
      const agentRecord = await this.prisma.agent.findUnique({
        where: { id: resolvedAgentId },
        select: { id: true },
      });
      if (!agentRecord) {
        throw new NotFoundException(
          `Agent with ID ${resolvedAgentId} not found`,
        );
      }
    }

    if (createCandidateDto.declaredProjectIds?.length) {
      if (resolvedSource !== 'agent' || !resolvedAgentId) {
        throw new BadRequestException(
          'declaredProjectIds is only allowed when source is agent and agentId is set.',
        );
      }
    }

    await assertPhysicalAddressConsistent(this.prisma, {
      addressCountryCode: createCandidateDto.addressCountryCode ?? null,
      addressStateId: createCandidateDto.addressStateId ?? null,
    });

    // Get the default status info for history tracking
    const defaultStatusId = createCandidateDto.currentStatusId ?? 1;
    const defaultStatus = await this.prisma.candidateStatus.findUnique({
      where: { id: defaultStatusId },
      select: { statusName: true },
    });

    const user = creatingUser;

    const candidateInclude = {
      team: true,
      workExperiences: candidateWorkExperiencesInclude,
      qualifications: candidateQualificationsInclude,
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
      agentCandidateDeclaredProjects: {
        include: {
          project: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    } as const;

    const candidate = await this.prisma.$transaction(async (tx) => {
      const candidateCode = await this.candidateCodeService.reserveNextCode(tx);

      const created = await tx.candidate.create({
        data: {
          candidateCode,
          firstName: createCandidateDto.firstName,
          lastName: createCandidateDto.lastName,
          countryCode: createCandidateDto.countryCode,
          mobileNumber: createCandidateDto.mobileNumber,
          email: createCandidateDto.email,
          profileImage: createCandidateDto.profileImage,
          addressCountryCode: createCandidateDto.addressCountryCode,
          addressStateId: createCandidateDto.addressStateId,
          address: createCandidateDto.address,
          source: resolvedSource,
          agentId: resolvedSource === 'agent' ? resolvedAgentId : null,
          referralCompanyName: createCandidateDto.referralCompanyName,
          referralCountryCode: createCandidateDto.referralCountryCode,
          referralEmail: createCandidateDto.referralEmail,
          referralPhone: createCandidateDto.referralPhone,
          referralDescription: createCandidateDto.referralDescription,
          dateOfBirth: createCandidateDto.dateOfBirth
            ? new Date(createCandidateDto.dateOfBirth)
            : null,
          gender: createCandidateDto.gender,
          currentStatusId: defaultStatusId,
          totalExperience: totalExperience,
          currentSalary: createCandidateDto.currentSalary,
          currentEmployer: createCandidateDto.currentEmployer,
          currentRole: createCandidateDto.currentRole,
          expectedMinSalary: createCandidateDto.expectedMinSalary,
          expectedMaxSalary: createCandidateDto.expectedMaxSalary,
          sectorType: createCandidateDto.sectorType,
          visaType: createCandidateDto.visaType,
          height: createCandidateDto.height,
          weight: createCandidateDto.weight,
          skinTone: createCandidateDto.skinTone,
          languageProficiency: createCandidateDto.languageProficiency,
          smartness: createCandidateDto.smartness,
          licensingExam: createCandidateDto.licensingExam,
          dataFlow: createCandidateDto.dataFlow ?? null,
          eligibility: createCandidateDto.eligibility ?? null,
          highestEducation: createCandidateDto.highestEducation,
          university: createCandidateDto.university,
          graduationYear: createCandidateDto.graduationYear,
          gpa: createCandidateDto.gpa,
          onHoldDuration: createCandidateDto.onHoldDuration,
          onHoldUntil: createCandidateDto.onHoldUntil
            ? new Date(createCandidateDto.onHoldUntil)
            : null,
          experience: totalExperience,
          skills: createCandidateDto.skills
            ? JSON.parse(createCandidateDto.skills)
            : [],
          teamId: createCandidateDto.teamId,
          preferredCountries: createCandidateDto.preferredCountries
            ? {
                create: createCandidateDto.preferredCountries.map((code) => ({
                  country: { connect: { code } },
                })),
              }
            : undefined,
          facilityPreferences: createCandidateDto.facilityPreferences
            ? {
                create: createCandidateDto.facilityPreferences.map(
                  (facilityType) => ({
                    facilityType,
                  }),
                ),
              }
            : undefined,
          qualifications: createCandidateDto.qualifications
            ? {
                create: createCandidateDto.qualifications.map((qual) => ({
                  qualificationId: qual.qualificationId,
                  university: qual.university,
                  graduationYear: qual.graduationYear,
                  gpa: qual.gpa,
                  isCompleted: qual.isCompleted ?? true,
                  notes: qual.notes,
                  countryCode:
                    normalizeOptionalCountryCode(qual.countryCode) ?? null,
                })),
              }
            : undefined,
          workExperiences: createCandidateDto.workExperiences
            ? {
                create: createCandidateDto.workExperiences.map((exp) => {
                  let parsedSkills = [];
                  if (exp.skills) {
                    try {
                      parsedSkills =
                        typeof exp.skills === 'string'
                          ? JSON.parse(exp.skills)
                          : exp.skills;
                    } catch (error: any) {
                      this.logger.warn(
                        `Failed to parse skills for work experience: ${error.message}`,
                      );
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
                    countryCode:
                      normalizeOptionalCountryCode(exp.countryCode) ?? null,
                    skills: parsedSkills,
                    achievements: exp.achievements,
                  };
                }),
              }
            : undefined,
        },
        select: { id: true },
      });

      if (
        resolvedSource === 'agent' &&
        resolvedAgentId &&
        createCandidateDto.declaredProjectIds?.length
      ) {
        await this.replaceAgentCandidateDeclaredProjects(
          tx,
          created.id,
          resolvedAgentId,
          createCandidateDto.declaredProjectIds,
        );
      }

      return tx.candidate.findUniqueOrThrow({
        where: { id: created.id },
        include: candidateInclude,
      });
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

    // Notify about candidate creation for real-time UI
    await this.outboxService.publishEvent('DataSync', {
      type: 'Candidate',
      candidateId: candidate.id,
      message: `New candidate ${candidate.firstName} ${candidate.lastName} created`,
    });

    return candidate;
  }

  async findAll(query: QueryCandidatesDto): Promise<PaginatedCandidates> {
    const {
      search,
      currentStatus,
      status,
      source,
      gender,
      teamId,
      assignedTo,
      minExperience,
      maxExperience,
      minSalary,
      maxSalary,
      dateOfBirthFrom,
      dateOfBirthTo,
      // server-side createdAt range filter (ISO strings)
      dateFrom,
      dateTo,
      roleCatalogId,
      agentId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      roles = [],
    } = query;

    // Handle status alias - status is an alias for currentStatus
    const effectiveStatus = currentStatus || status;

    // Build where clause
    const where: any = {};

    // 1. Leadership / Agent Coordinator: may see candidates with source === 'agent'
    if (!canSeeAgentSourcedCandidates(roles)) {
      where.NOT = {
        source: 'agent',
      };
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const s = search.trim();
      // Search across primary candidate fields and related qualifications
      where.OR = [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { candidateCode: { contains: s, mode: 'insensitive' } },
        { mobileNumber: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        // Match candidate qualifications (qualification name / shortName / field / university)
        {
          qualifications: {
            some: {
              OR: [
                { qualification: { name: { contains: s, mode: 'insensitive' } } },
                { qualification: { shortName: { contains: s, mode: 'insensitive' } } },
                { qualification: { field: { contains: s, mode: 'insensitive' } } },
                { university: { contains: s, mode: 'insensitive' } },
              ],
            },
          },
        },
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

    if (agentId) {
      where.agentId = agentId;
    }

    if (gender) {
      where.gender = gender;
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
      where.expectedMinSalary = {};
      if (minSalary !== undefined) {
        where.expectedMinSalary.gte = minSalary;
      }
      if (maxSalary !== undefined) {
        where.expectedMinSalary.lte = maxSalary;
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

    // createdAt range filter (date added) - server-side
    // Treat incoming dateFrom/dateTo as calendar dates — normalize to UTC day boundaries
    if (dateFrom || dateTo) {
      const rawFrom = dateFrom;
      const rawTo = dateTo;

      let fromDt: Date | undefined;
      let toDt: Date | undefined;

      if (rawFrom) {
        const parsed = new Date(rawFrom);
        fromDt = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0, 0));
      }

      if (rawTo) {
        const parsed = new Date(rawTo);
        toDt = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 23, 59, 59, 999));
      }

      if (fromDt && toDt && fromDt.getTime() > toDt.getTime()) {
        const tmp = fromDt;
        fromDt = toDt;
        toDt = tmp;
      }

      where.createdAt = {} as any;
      if (fromDt) {
        where.createdAt.gte = fromDt;
      }
      if (toDt) {
        where.createdAt.lte = toDt;
      }

      this.logger.log(`Applying createdAt filter in findAll(): rawFrom=${rawFrom || 'n/a'} rawTo=${rawTo || 'n/a'} normalizedFrom=${fromDt?.toISOString() || 'n/a'} normalizedTo=${toDt?.toISOString() || 'n/a'}`);
    }

    if (roleCatalogId && roleCatalogId !== 'all') {
      where.workExperiences = {
        some: {
          roleCatalogId: roleCatalogId,
        },
      };
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

    // apply createdAt filter to dashboard counts when provided (use same normalization)
    if (dateFrom || dateTo) {
      const rawFrom = dateFrom;
      const rawTo = dateTo;
      let fromDt: Date | undefined;
      let toDt: Date | undefined;

      if (rawFrom) {
        const parsed = new Date(rawFrom);
        fromDt = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0, 0));
      }
      if (rawTo) {
        const parsed = new Date(rawTo);
        toDt = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 23, 59, 59, 999));
      }

      baseWhere.createdAt = {} as any;
      if (fromDt) baseWhere.createdAt.gte = fromDt;
      if (toDt) baseWhere.createdAt.lte = toDt;
    }

    // Get all candidate status records in one query
    const statuses = await this.prisma.candidateStatus.findMany({
      where: {
        statusName: {
          in: [
            'untouched', 'rnr', 'on_hold', 'interested', 'not_interested',
            'other_enquiry', 'qualified', 'future', CANDIDATE_STATUS.DEPLOYED
          ],
          mode: 'insensitive'
        }
      }
    });

    const getStatusId = (name: string) => statuses.find(s => s.statusName.toLowerCase() === name.toLowerCase())?.id;
    
    const untouchedId = getStatusId('untouched');
    const rnrId = getStatusId('rnr');
    const onHoldId = getStatusId('on_hold');
    const interestedId = getStatusId('interested');
    const notInterestedId = getStatusId('not_interested');
    const otherEnquiryId = getStatusId('other_enquiry');
    const qualifiedId = getStatusId('qualified');
    const futureId = getStatusId('future');
    const deployedId = getStatusId(CANDIDATE_STATUS.DEPLOYED);

    // Optimized counting using groupBy and count
    const [statusCounts, totalCount, creCount, rnrCreCount] = await Promise.all([
      this.prisma.candidate.groupBy({
        by: ['currentStatusId'],
        where: baseWhere,
        _count: { _all: true },
      }),
      this.prisma.candidate.count({ where: baseWhere }),
      this.prisma.candidate.count({
        where: {
          ...baseWhere,
          recruiterAssignments: {
            some: {
              isActive: true,
              assignmentType: { in: [CANDIDATE_ASSIGNMENT_TYPE.CRE_AUTO, CANDIDATE_ASSIGNMENT_TYPE.CRE_MANUAL] }
            }
          }
        }
      }),
      this.prisma.candidate.count({
        where: {
          ...baseWhere,
          currentStatusId: rnrId,
          recruiterAssignments: {
            some: {
              isActive: true,
              assignmentType: { in: [CANDIDATE_ASSIGNMENT_TYPE.CRE_AUTO, CANDIDATE_ASSIGNMENT_TYPE.CRE_MANUAL] }
            }
          }
        }
      })
    ]);

    const getCountForStatus = (statusId?: number) => 
      statusId ? (statusCounts.find(c => c.currentStatusId === statusId)?._count._all || 0) : 0;

    const counts = {
      total: totalCount,
      handledByCRE: creCount,
      untouched: getCountForStatus(untouchedId),
      rnr: getCountForStatus(rnrId),
      rnrHandledByCRE: rnrCreCount,
      onHold: getCountForStatus(onHoldId),
      interested: getCountForStatus(interestedId),
      notInterested: getCountForStatus(notInterestedId),
      otherEnquiry: getCountForStatus(otherEnquiryId),
      qualified: getCountForStatus(qualifiedId),
      future: getCountForStatus(futureId),
      working: getCountForStatus(deployedId),
    };

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
        team: {
          select: {
            id: true,
            name: true,
          }
        },
        recruiterAssignments: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            assignmentType: true,
            recruiter: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          }
        },
        projects: {
          take: 5,
          select: {
            id: true,
            projectId: true,
            project: {
              select: {
                id: true,
                title: true,
              }
            }
          }
        },
        workExperiences: {
          take: 1,
          orderBy: { startDate: 'desc' },
          select: {
            id: true,
            jobTitle: true,
            companyName: true,
            roleCatalog: {
              select: {
                id: true,
                name: true,
                label: true,
                shortName: true,
              },
            },
          }
        },
        documents: {
          where: { isDeleted: false },
          select: { docType: true },
        },
      },
    });

    const candidatesWithCreator = candidates.map((candidate: any) => {
      // Find the specific active assignment
      const activeAssignment = candidate.recruiterAssignments?.[0];
      
      // Find the specific CRE assignment if it exists
      const creAssignment = candidate.recruiterAssignments.find(
        (a: any) => a.assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_AUTO || a.assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_MANUAL
      );

      // Check if candidate is handled by a CRE
      const isHandledByCRE = !!creAssignment;

      // Check if any active assignment is marked as CRE_REASSIGNED
      const isCREReassigned = candidate.recruiterAssignments.some(
        (a: any) => a.assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_REASSIGNED
      );

      const { documents, ...rest } = candidate;
      const merged = withProfileCompletion({
        ...rest,
        documents: documents ?? [],
      });
      return {
        ...merged,
        isHandledByCRE,
        isCREReassigned,
        creHandler: creAssignment ? {
          id: creAssignment.recruiter.id,
          name: creAssignment.recruiter.name,
          email: creAssignment.recruiter.email,
        } : null,
        recruiter: activeAssignment?.recruiter || null,
      };
    });

    return {
      candidates: candidatesWithCreator as any,
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
   * Get consolidated candidates for project detail view
   * Admin/Manager-style roles see all; Recruiter and Agent Coordinator see active recruiter assignments only.
   * Includes nomination status for a specific project
   */
  async getConsolidatedCandidates(
    queryDto: ConsolidatedCandidateQueryDto,
    userId: string,
    roles: string[],
  ) {
    const { projectId, search, roleCatalogId, page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const isRecruiter = roles.includes('Recruiter');
    const isAgentCoordinator = roles.includes(ROLE_NAMES.AGENT_COORDINATOR);
    const isAdminOrManager = roles.some((role) =>
      [
        'CEO',
        'Director',
        'Manager',
        'Team Head',
        'Team Lead',
        'Admin',
        'SuperAdmin',
      ].includes(role),
    );

    // Build where clause
    const where: any = {};

    // 1. Leadership / Agent Coordinator: may see candidates with source === 'agent'
    if (!canSeeAgentSourcedCandidates(roles)) {
      where.NOT = {
        source: 'agent',
      };
    }

    // 2. Role-based filtering (recruiters and agent coordinators see assigned candidates only)
    if ((isRecruiter || isAgentCoordinator) && !isAdminOrManager) {
      where.recruiterAssignments = {
        some: {
          recruiterId: userId,
          isActive: true,
        },
      };
    }

    // 2. Search
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const s = search.trim();
      where.OR = [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { mobileNumber: { contains: s, mode: 'insensitive' } },
        {
          qualifications: {
            some: {
              OR: [
                {
                  qualification: {
                    name: { contains: s, mode: 'insensitive' },
                  },
                },
                {
                  qualification: {
                    shortName: { contains: s, mode: 'insensitive' },
                  },
                },
                {
                  qualification: {
                    field: { contains: s, mode: 'insensitive' },
                  },
                },
                { name: { contains: s, mode: 'insensitive' } },
                { university: { contains: s, mode: 'insensitive' } },
              ],
            },
          },
        },
        {
          skills: {
            hasSome: [s],
          },
        },
      ];
    }

    // 3. Role Catalog Filter
    if (roleCatalogId && roleCatalogId !== 'all') {
      where.workExperiences = {
        some: {
          roleCatalogId: roleCatalogId,
        },
      };
    }

    if (!where.AND) {
      where.AND = [agentSourceConsolidatedCandidateWhere(projectId)];
    } else if (Array.isArray(where.AND)) {
      where.AND.push(agentSourceConsolidatedCandidateWhere(projectId));
    } else {
      where.AND = [where.AND, agentSourceConsolidatedCandidateWhere(projectId)];
    }

    const [candidates, total] = await Promise.all([
      this.prisma.candidate.findMany({
        where,
        skip,
        take: limit,
        include: {
          currentStatus: {
            select: {
              id: true,
              statusName: true,
            },
          },
          agent: {
            select: {
              id: true,
              name: true,
            },
          },
          qualifications: candidateQualificationsInclude,
          workExperiences: candidateWorkExperiencesInclude,
          projects: {
            where: {
              projectId: projectId,
            },
            include: {
              mainStatus: true,
              subStatus: true,
              project: {
                select: {
                  title: true,
                },
              },
              roleNeeded: {
                include: {
                  roleCatalog: true,
                },
              },
            },
          },
          recruiterAssignments: {
            where: { isActive: true },
            include: {
              recruiter: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          preferredCountries: true,
          facilityPreferences: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.candidate.count({ where }),
    ]);

    const formattedCandidates = candidates.map((candidate) => {
      const assignment = candidate.projects[0];
      const isNominated = !!assignment;

      // Find the specific CRE assignment if it exists
      const creAssignment = candidate.recruiterAssignments.find(
        (a) => a.assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_AUTO || a.assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_MANUAL
      );

      // Check if candidate is handled by a CRE
      const isHandledByCRE = !!creAssignment;

      // Check if any active assignment is marked as CRE_REASSIGNED
      const isCREReassigned = candidate.recruiterAssignments.some(
        (a) => a.assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_REASSIGNED
      );

      // Extract the fields we want to keep and exclude the projects array as requested by the user
      // No need for projects array in individual candidates since we have projectDetails for the specific project
      const { projects, ...candidateData } = candidate;

      return {
        ...candidateData,
        isNominated,
        isHandledByCRE,
        isCREReassigned,
        creHandler: creAssignment ? {
          id: creAssignment.recruiter.id,
          name: creAssignment.recruiter.name,
          email: creAssignment.recruiter.email,
          assignedAt: creAssignment.assignedAt,
          assignmentType: creAssignment.assignmentType,
        } : null,
        projectSubStatus: assignment?.subStatus,
        projectMainStatus: assignment?.mainStatus,
        projectDetails: isNominated
          ? {
              projectId: assignment.projectId,
              projectTitle: assignment.project?.title,
              mainStatus:
                assignment.mainStatus?.label || assignment.mainStatus?.name,
              subStatus: assignment.subStatus?.label || assignment.subStatus?.name,
              nominatedRole:
                assignment.roleNeeded?.roleCatalog?.name || 'N/A',
              roleNeeded: assignment.roleNeeded
                ? {
                    id: assignment.roleNeeded.id,
                    projectId: assignment.roleNeeded.projectId,
                    roleCatalogId: assignment.roleNeeded.roleCatalogId,
                    designation: assignment.roleNeeded.designation,
                    roleCatalog: assignment.roleNeeded.roleCatalog,
                  }
                : null,
            }
          : null,
      };
    });

    return {
      candidates: formattedCandidates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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
      gender?: string;
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
    const { page = 1, limit = 10, search, currentStatus, gender } = query;
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
        { candidateCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Add status filter (supports numeric id or statusName string)
    const normalizedStatusInput = currentStatus?.toLowerCase().trim();

    const statusNameMap: Record<string, string> = {
      interested: 'interested',
      rnr: 'rnr',
      'on_hold': 'on hold',
      'on hold': 'on hold',
      untouched: 'untouched',
      junk: 'junk',
    };

    if (normalizedStatusInput) {
      if (normalizedStatusInput === 'interested') {
        // Converted Response mode: now identified by assignmentType instead of status
        where.recruiterAssignments.some.assignmentType = CANDIDATE_ASSIGNMENT_TYPE.CRE_CONVERTED;
      } else if (normalizedStatusInput === 'junk') {
        // Junk Candidates logic: Assigned > 5 days ago, active, not converted/reassigned
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - 5);

        where.recruiterAssignments = {
          some: {
            recruiterId: creUserId,
            isActive: true,
            assignedAt: { lt: threshold },
            assignmentType: {
              notIn: [
                CANDIDATE_ASSIGNMENT_TYPE.CRE_CONVERTED,
                CANDIDATE_ASSIGNMENT_TYPE.CRE_REASSIGNED,
              ],
            },
          },
        };
      } else {
        const normalizedStatus = statusNameMap[normalizedStatusInput] ?? normalizedStatusInput;
        const statusId = Number(normalizedStatusInput);

        if (!Number.isNaN(statusId)) {
          where.currentStatusId = statusId;
        } else {
          where.currentStatus = { statusName: { equals: normalizedStatus, mode: 'insensitive' } };
        }
      }
    } else {
      // Default CRE assigned listing: exclude converted, reassigned, and junk (assigned > 5 days ago) candidates
      const junkThreshold = new Date();
      junkThreshold.setDate(junkThreshold.getDate() - 5);
      where.recruiterAssignments = {
        some: {
          recruiterId: creUserId,
          isActive: true,
          assignedAt: { gte: junkThreshold },
          assignmentType: {
            notIn: [
              CANDIDATE_ASSIGNMENT_TYPE.CRE_CONVERTED,
              CANDIDATE_ASSIGNMENT_TYPE.CRE_REASSIGNED,
            ],
          },
        },
      };
    }

    // Add gender filter
    if (gender) {
      where.gender = gender;
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
        workExperiences: candidateWorkExperiencesInclude,
        qualifications: candidateQualificationsInclude,
        recruiterAssignments: {
          where: { isActive: true },
          orderBy: { assignedAt: 'desc' },
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

  async getCREAssignedSummary(creUserId: string): Promise<{ total: number; roleCounters: any }> {
    const allAssigned = await this.prisma.candidate.findMany({
      where: {
        recruiterAssignments: {
          some: {
            recruiterId: creUserId,
            isActive: true,
          },
        },
      },
      select: {
        currentStatus: {
          select: {
            statusName: true,
          },
        },
        recruiterAssignments: {
          select: {
            assignmentType: true,
            assignedAt: true,
          },
          where: {
            recruiterId: creUserId,
            isActive: true,
          },
        },
      },
    });

    const threshold = new Date();
    threshold.setDate(threshold.getDate() - 5);

    const roleCounters = {
      assigned: 0,
      converted: 0,
      reassigned: 0,
      rnr: 0,
      onHold: 0,
      untouched: 0,
      junk: 0,
      other: 0,
    };

    allAssigned.forEach((candidate) => {
      const assignment = candidate.recruiterAssignments[0];
      const assignmentType = assignment?.assignmentType;
      const assignedAt = assignment?.assignedAt;
      
      if (assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_CONVERTED || 
          assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_REASSIGNED) {
        if (assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_CONVERTED) {
          roleCounters.converted += 1;
        }
        return; // Don't count converted or reassigned in "Total Assigned" status-based buckets
      }

      // Check for junk (assigned > 5 days ago)
      if (assignedAt && assignedAt < threshold) {
        roleCounters.junk += 1;
        return; // Don't count junk candidates in status-based buckets or total
      }

      const status = (candidate.currentStatus?.statusName || '').toLowerCase();
      if (status === 'rnr') {
        roleCounters.rnr += 1;
      } else if (status === 'on hold' || status === 'on_hold') {
        roleCounters.onHold += 1;
      } else if (status === 'untouched') {
        roleCounters.untouched += 1;
      } else if (status === 'interested') {
        // Legacy check for interested status
        roleCounters.converted += 1;
        return;
      } else {
        roleCounters.other += 1;
      }
    });

    roleCounters.assigned =
      roleCounters.rnr +
      roleCounters.onHold +
      roleCounters.untouched +
      roleCounters.other;

    // Count reassigned candidates (CRE transferred to recruiter, now untouched)
    roleCounters.reassigned = await this.prisma.candidate.count({
      where: {
        OR: [
          {
            recruiterAssignments: {
              some: {
                recruiterId: creUserId,
                assignmentType: CANDIDATE_ASSIGNMENT_TYPE.CRE_REASSIGNED,
                isActive: true,
              },
            },
          },
          {
            recruiterAssignments: {
              some: {
                assignedBy: creUserId,
                assignmentType: CANDIDATE_ASSIGNMENT_TYPE.CRE_REASSIGNED,
                isActive: true,
              },
            },
          },
        ],
        currentStatus: {
          statusName: { equals: CANDIDATE_STATUS.UNTOUCHED, mode: 'insensitive' },
        },
      },
    });

    // Count candidates created by this CRE user
    const createdCount = await this.prisma.candidate.count({
      where: {
        recruiterAssignments: {
          some: {
            createdBy: creUserId,
          },
        },
      },
    });

    return {
      total: roleCounters.assigned,
      roleCounters: {
        ...roleCounters,
        created: createdCount,
      },
    };
  }

  async markAsConvertedResponse(candidateId: string, userId: string): Promise<CandidateWithRelations> {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        recruiterAssignments: {
          where: { isActive: true },
          include: {
            recruiter: true,
            assignedByUser: true,
          },
        },
        currentStatus: true,
      },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    const creAssignment = candidate.recruiterAssignments?.find(
      (a: any) => a.recruiterId === userId && a.isActive,
    );

    if (!creAssignment) {
      throw new ForbiddenException('CRE may only convert assigned candidates.');
    }

    // Update assignment type to cre_converted instead of changing candidate status
    await this.prisma.candidateRecruiterAssignment.update({
      where: { id: creAssignment.id },
      data: {
        assignmentType: CANDIDATE_ASSIGNMENT_TYPE.CRE_CONVERTED,
      },
    });

    const updatedCandidate = await this.prisma.candidate.update({
      where: { id: candidateId },
      data: {
        updatedAt: new Date(),
      },
      include: {
        recruiterAssignments: {
          include: {
            recruiter: {
              select: { id: true, name: true, email: true },
            },
            assignedByUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        currentStatus: true,
      },
    });

    await this.outboxService.publishEvent('DataSync', {
      type: 'Candidate',
      candidateId,
      message: `Candidate ${updatedCandidate.firstName} ${updatedCandidate.lastName} marked as converted response by CRE`,
    });

    return updatedCandidate as any;
  }

  async transferCREConvertedToRecruiter(candidateId: string, creUserId: string, notes?: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        recruiterAssignments: {
          where: { isActive: true },
          include: { recruiter: true },
        },
        currentStatus: true,
      },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    const activeCREAssignment = candidate.recruiterAssignments?.find(
      (a: any) => a.recruiterId === creUserId && a.isActive,
    );

    if (!activeCREAssignment) {
      throw new ForbiddenException(
        'CRE can only transfer candidates assigned to them',
      );
    }

    // Find the PRIMARY recruiter (regular recruiter)
    const primaryAssignment = candidate.recruiterAssignments?.find(
      (a: any) => a.isActive && a.assignmentType !== CANDIDATE_ASSIGNMENT_TYPE.CRE_AUTO && a.assignmentType !== CANDIDATE_ASSIGNMENT_TYPE.CRE_MANUAL
    );

    // Deactivate the CRE's assignment
    await this.prisma.candidateRecruiterAssignment.update({
      where: { id: activeCREAssignment.id },
      data: {
        isActive: false,
        unassignedAt: new Date(),
        unassignedBy: creUserId,
      },
    });

    // Update the primary recruiter assignment to mark it as cre_reassigned
    if (primaryAssignment) {
      await this.prisma.candidateRecruiterAssignment.update({
        where: { id: primaryAssignment.id },
        data: {
          assignmentType: CANDIDATE_ASSIGNMENT_TYPE.CRE_REASSIGNED,
          assignedBy: creUserId,
          reason: notes || 'Handed back from CRE converted response',
        },
      });
    }

    // Notify about handoff
    await this.outboxService.publishCandidateRecruiterAssigned(
      candidateId,
      primaryAssignment?.recruiterId || creUserId, // Notify the primary recruiter (or self if none)
      creUserId,
      notes || 'Handed back from CRE converted response',
      creUserId, // Previous was the CRE
    );

    const untouchedStatus = await this.prisma.candidateStatus.findFirst({
      where: { statusName: { equals: CANDIDATE_STATUS.UNTOUCHED, mode: 'insensitive' } },
    });

    if (!untouchedStatus) {
      throw new NotFoundException('Untouched status not found');
    }

    const updatedCandidate = await this.prisma.candidate.update({
      where: { id: candidateId },
      data: { currentStatusId: untouchedStatus.id },
      include: {
        recruiterAssignments: {
          include: {
            recruiter: {
              select: { id: true, name: true, email: true },
            },
            assignedByUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        currentStatus: true,
      },
    });

    await this.prisma.candidateStatusHistory.create({
      data: {
        candidateId,
        changedById: creUserId,
        changedByName:
          (await this.prisma.user.findUnique({ where: { id: creUserId } }))
            ?.name || 'CRE',
        statusId: untouchedStatus.id,
        statusNameSnapshot: untouchedStatus.statusName,
        statusUpdatedAt: new Date(),
        notificationCount: 0,
      },
    });

    await this.outboxService.publishEvent('DataSync', {
      type: 'Candidate',
      candidateId,
      message: `Candidate ${updatedCandidate.firstName} ${updatedCandidate.lastName} transferred from CRE to recruiter ${primaryAssignment?.recruiter?.name || 'Primary Recruiter'}`,
    });

    // Notify the target recruiter that a CRE has transferred a candidate to them
    if (primaryAssignment) {
      await this.outboxService.publishRecruiterNotification(
        primaryAssignment.recruiterId,
        `Candidate ${updatedCandidate.firstName} ${updatedCandidate.lastName} has been transferred back to you by CRE ${(await this.prisma.user.findUnique({ where: { id: creUserId } }))?.name || 'a team member'} after being converted from RNR.`,
        'Candidate Transferred from CRE',
        `/candidates/${candidateId}`,
        {
          candidateId,
          creUserId,
          transferType: 'cre_to_recruiter'
        }
      );
    }

    return updatedCandidate;
  }

  async getCREReassignedCandidates(
    recruiterId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
    },
  ) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [
        {
          recruiterAssignments: {
            some: {
              recruiterId: recruiterId,
              assignmentType: CANDIDATE_ASSIGNMENT_TYPE.CRE_REASSIGNED,
              isActive: true,
            },
          },
        },
        {
          recruiterAssignments: {
            some: {
              assignedBy: recruiterId,
              assignmentType: CANDIDATE_ASSIGNMENT_TYPE.CRE_REASSIGNED,
              isActive: true,
            },
          },
        },
      ],
      currentStatus: {
        statusName: { equals: CANDIDATE_STATUS.UNTOUCHED, mode: 'insensitive' },
      },
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { mobileNumber: { contains: search, mode: 'insensitive' } },
        { candidateCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const total = await this.prisma.candidate.count({ where });

    const candidates = await this.prisma.candidate.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        currentStatus: { select: { id: true, statusName: true } },
        recruiterAssignments: {
          where: { isActive: true },
          include: {
            recruiter: { select: { id: true, name: true, email: true } },
            assignedByUser: { select: { id: true, name: true, email: true } },
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

  /**
   * Get candidates created by a specific CRE user
   * Uses candidateRecruiterAssignment.createdBy to identify creator
   */
  async getUserCandidates(
    creUserId: string,
    query: { page?: number; limit?: number; search?: string },
  ) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      recruiterAssignments: {
        some: {
          createdBy: creUserId,
        },
      },
    };

    if (search) {
      where.AND = [
        {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { mobileNumber: { contains: search, mode: 'insensitive' } },
            { candidateCode: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const total = await this.prisma.candidate.count({ where });

    const candidates = await this.prisma.candidate.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        currentStatus: { select: { id: true, statusName: true } },
        recruiterAssignments: {
          where: { isActive: true },
          include: {
            recruiter: { select: { id: true, name: true, email: true } },
            assignedByUser: { select: { id: true, name: true, email: true } },
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
        currentStatus: {
          select: {
            id: true,
            statusName: true,
          },
        },
        team: true,
        workExperiences: candidateWorkExperiencesInclude,
        qualifications: candidateQualificationsInclude,
        preferredCountries: {
          include: {
            country: true,
          },
        },
        facilityPreferences: true,
        addressCountry: {
          select: { code: true, name: true },
        },
        addressState: {
          select: { id: true, name: true, code: true },
        },
        agentCandidateDeclaredProjects: {
          include: {
            project: {
              select: {
                id: true,
                title: true,
              },
            },
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
            assignedByUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            createdByUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { assignedAt: 'asc' },
        },
        documents: {
          where: { isDeleted: false },
          select: { docType: true },
        },
      },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }

    // Extract the creator from the first active assignment
    const firstAssignment = candidate.recruiterAssignments?.[0];
    const createdBy =
      firstAssignment?.createdByUser ||
      firstAssignment?.assignedByUser ||
      null;

    const base = withProfileCompletion(candidate as any);

    // Pipeline data removed from response to reduce payload
    return {
      ...base,
      createdBy,
      careerGapAnalysis: calculateCareerGaps(
        candidate.workExperiences ?? [],
        candidate.qualifications ?? [],
      ),
    } as any;
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

    // CRE users should only be able to view candidate details, not edit
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

    if (user?.userRoles?.some((ur) => ur.role?.name === 'CRE')) {
      throw new ForbiddenException('CRE users cannot update candidate details.');
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
    // Allow explicitly clearing dateOfBirth to null

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
    if (updateCandidateDto.addressCountryCode !== undefined)
      updateData.addressCountryCode = updateCandidateDto.addressCountryCode;
    if (updateCandidateDto.addressStateId !== undefined)
      updateData.addressStateId = updateCandidateDto.addressStateId;
    if (updateCandidateDto.address !== undefined)
      updateData.address = updateCandidateDto.address;
    if (updateCandidateDto.source)
      updateData.source = updateCandidateDto.source;
    if (updateCandidateDto.agentId !== undefined) {
      const v = updateCandidateDto.agentId;
      updateData.agentId = v === '' || v === null ? null : v;
    }
    if (updateCandidateDto.referralCompanyName !== undefined)
      updateData.referralCompanyName = updateCandidateDto.referralCompanyName;
    if (updateCandidateDto.referralCountryCode !== undefined)
      updateData.referralCountryCode = updateCandidateDto.referralCountryCode;
    if (updateCandidateDto.referralEmail !== undefined)
      updateData.referralEmail = updateCandidateDto.referralEmail;
    if (updateCandidateDto.referralPhone !== undefined)
      updateData.referralPhone = updateCandidateDto.referralPhone;
    if (updateCandidateDto.referralDescription !== undefined)
      updateData.referralDescription = updateCandidateDto.referralDescription;
    if (updateCandidateDto.dateOfBirth !== undefined)
      updateData.dateOfBirth = updateCandidateDto.dateOfBirth
        ? new Date(updateCandidateDto.dateOfBirth)
        : null;
    if (updateCandidateDto.gender)
      updateData.gender = updateCandidateDto.gender;
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
    if (updateCandidateDto.expectedMinSalary !== undefined)
      updateData.expectedMinSalary = updateCandidateDto.expectedMinSalary;
    // expectedMaxSalary is no longer used in matching logic; we keep it for schema
    // compatibility but do not update it from UI by default.
    if (updateCandidateDto.sectorType !== undefined)
      updateData.sectorType = updateCandidateDto.sectorType;
    if (updateCandidateDto.visaType !== undefined)
      updateData.visaType = updateCandidateDto.visaType;
    if (updateCandidateDto.height !== undefined)
      updateData.height = updateCandidateDto.height;
    if (updateCandidateDto.weight !== undefined)
      updateData.weight = updateCandidateDto.weight;
    if (updateCandidateDto.skinTone !== undefined)
      updateData.skinTone = updateCandidateDto.skinTone;
    if (updateCandidateDto.languageProficiency !== undefined)
      updateData.languageProficiency = updateCandidateDto.languageProficiency;
    if (updateCandidateDto.smartness !== undefined)
      updateData.smartness = updateCandidateDto.smartness;
    if (updateCandidateDto.licensingExam !== undefined)
      updateData.licensingExam = updateCandidateDto.licensingExam;
    if (updateCandidateDto.dataFlow !== undefined)
      updateData.dataFlow = updateCandidateDto.dataFlow;
    if (updateCandidateDto.eligibility !== undefined)
      updateData.eligibility = updateCandidateDto.eligibility;
    if (updateCandidateDto.highestEducation)
      updateData.highestEducation = updateCandidateDto.highestEducation;
    if (updateCandidateDto.university)
      updateData.university = updateCandidateDto.university;
    if (updateCandidateDto.graduationYear !== undefined)
      updateData.graduationYear = updateCandidateDto.graduationYear;
    if (updateCandidateDto.onHoldDuration !== undefined)
      updateData.onHoldDuration = updateCandidateDto.onHoldDuration;
    if (updateCandidateDto.onHoldUntil !== undefined)
      updateData.onHoldUntil = updateCandidateDto.onHoldUntil ? new Date(updateCandidateDto.onHoldUntil) : null;
    if (updateCandidateDto.gpa !== undefined)
      updateData.gpa = updateCandidateDto.gpa;
    if (updateCandidateDto.skills)
      updateData.skills = JSON.parse(updateCandidateDto.skills);
    if (updateCandidateDto.teamId !== undefined)
      updateData.teamId = updateCandidateDto.teamId;

    if (updateCandidateDto.preferredCountries) {
      updateData.preferredCountries = {
        deleteMany: {},
        create: updateCandidateDto.preferredCountries.map((code) => ({
          country: { connect: { code } },
        })),
      };
    }
    if (updateCandidateDto.facilityPreferences) {
      updateData.facilityPreferences = {
        deleteMany: {},
        create: updateCandidateDto.facilityPreferences.map((facilityType) => ({
          facilityType,
        })),
      };
    }

    const declaredIdsPayload = updateCandidateDto.declaredProjectIds;

    const mergedAgentValue =
      updateCandidateDto.agentId !== undefined ? updateCandidateDto.agentId : existingCandidate.agentId;
    const finalAgentIdMerged =
      mergedAgentValue === '' || mergedAgentValue === undefined || mergedAgentValue === null
        ? null
        : mergedAgentValue;

    if (declaredIdsPayload !== undefined) {
      const hasDeclared =
        Array.isArray(declaredIdsPayload) && declaredIdsPayload.length > 0;
      /** Declarations are keyed off agent linkage; referrals may omit source=agent in legacy rows. */
      if (hasDeclared && !finalAgentIdMerged) {
        throw new BadRequestException(
          'declaredProjectIds can only be set when the candidate is linked to an agent (agentId).',
        );
      }
    }

    await assertPhysicalAddressConsistent(
      this.prisma,
      mergePhysicalAddress(existingCandidate, {
        addressCountryCode: updateCandidateDto.addressCountryCode,
        addressStateId: updateCandidateDto.addressStateId,
      }),
    );

    const candidateUpdateInclude = {
      team: true,
      workExperiences: candidateWorkExperiencesInclude,
      qualifications: candidateQualificationsInclude,
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
      agentCandidateDeclaredProjects: {
        include: {
          project: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    } as const;

    let candidate = await this.prisma.candidate.update({
      where: { id },
      data: updateData,
      include: candidateUpdateInclude,
    });

    if (declaredIdsPayload !== undefined && finalAgentIdMerged) {
      await this.prisma.$transaction(async (tx) => {
        await this.replaceAgentCandidateDeclaredProjects(
          tx,
          id,
          finalAgentIdMerged,
          declaredIdsPayload ?? [],
        );
      });

      candidate = await this.prisma.candidate.findUniqueOrThrow({
        where: { id },
        include: candidateUpdateInclude,
      });
    }

    // Notify about candidate update for real-time UI
    await this.outboxService.publishEvent('DataSync', {
      type: 'Candidate',
      candidateId: id,
      message: `Candidate ${candidate.firstName} ${candidate.lastName} updated`,
    });

    const docs = await this.prisma.document.findMany({
      where: { candidateId: id, isDeleted: false },
      select: { docType: true },
    });

    return {
      ...candidate,
      profileCompletion: computeCandidateProfileCompletion(candidate, docs),
    } as any;
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

    // Notify about candidate deletion for real-time UI
    await this.outboxService.publishEvent('DataSync', {
      type: 'Candidate',
      candidateId: id,
      message: `Candidate ${candidate.firstName} ${candidate.lastName} deleted`,
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

    // Check if candidate is handled by CRE (Restricted for Recruiters)
    const isHandledByCRE = await this.isHandledByCRE(candidateId);
    if (isHandledByCRE) {
      // Get user roles to check if they are exempt (Admin/CRE)
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { userRoles: { include: { role: true } } }
      });
      const isAdminOrCRE = user?.userRoles.some(ur => 
        ['System Admin', 'CRE'].includes(ur.role.name)
      );

      if (!isAdminOrCRE) {
        throw new ForbiddenException(
          'Candidate is currently being handled by CRE and cannot be assigned to projects until handed back to recruiter.',
        );
      }
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
        qualifications: candidateQualificationsInclude,
        workExperiences: candidateWorkExperiencesInclude,
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
    } catch (error: any) {
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
    // Check gender requirements
    if (role.genderRequirement && role.genderRequirement !== 'all') {
      const candidateGender = candidate.gender?.toLowerCase();
      const requiredGender = role.genderRequirement.toLowerCase();
      if (candidateGender !== requiredGender) {
        return false;
      }
    }

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
      direct_enquiry: 0,
      referral: 0,
      paid_ads: 0,
      agents: 0,
      hospital_visit: 0,
      expo_event: 0,
      job_board: 0,
      social_media: 0,
      direct_application: 0,
      internal: 0,
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
        expectedMinSalary: true,
      },
      where: {
        experience: { not: null },
        expectedMinSalary: { not: null },
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
      averageExpectedSalary: experienceStats._avg.expectedMinSalary || 0,
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

    // Check if candidate is handled by CRE (Restricted for Recruiters)
    const isHandledByCRE = await this.isHandledByCRE(candidateId);
    if (isHandledByCRE) {
      // Get user roles to check if they are exempt (Admin/CRE)
      const user = await this.prisma.user.findUnique({
        where: { id: nominatorId },
        include: { userRoles: { include: { role: true } } }
      });
      const isAdminOrCRE = user?.userRoles.some(ur => 
        ['System Admin', 'CRE'].includes(ur.role.name)
      );

      if (!isAdminOrCRE) {
        throw new ForbiddenException(
          'Candidate is currently being handled by CRE and cannot be nominated to projects until handed back to recruiter.',
        );
      }
    }

    await assertAgentCandidateLinkedToAgentProject(
      this.prisma,
      candidate,
      nominateDto.projectId,
    );

    const prismaTx = this.prisma as unknown as Prisma.TransactionClient;
    const nominationRow = await this.createProjectNominationForWorkflow(
      prismaTx,
      candidateId,
      {
        projectId: nominateDto.projectId,
        notes: nominateDto.notes,
      },
    );

    const nomination = await this.prisma.candidateProjects.findUniqueOrThrow({
      where: { id: nominationRow.id },
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

    // Status-specific validation
    const normalizedStatus = status.statusName.toLowerCase();

    if (normalizedStatus === 'on hold' || normalizedStatus === 'onhold') {
      if (
        (updateStatusDto.onHoldDurationDays === undefined ||
          updateStatusDto.onHoldDurationDays === null ||
          updateStatusDto.onHoldDurationDays <= 0) &&
        !updateStatusDto.onHoldUntil
      ) {
        throw new BadRequestException(
          'onHoldDurationDays or onHoldUntil is required when status is On Hold',
        );
      }
    }

    if (normalizedStatus === 'future') {
      if (!updateStatusDto.futureDate) {
        throw new BadRequestException(
          'futureDate is required when status is Future',
        );
      }
      const futureDate = new Date(updateStatusDto.futureDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (futureDate < today) {
        throw new BadRequestException(
          'futureDate must be today or a future date when status is Future',
        );
      }
    }

    // Get the user (who’s changing the status) and enforce CRE read-only behavior
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

    if (user?.userRoles?.some((ur) => ur.role?.name === 'CRE')) {
      throw new ForbiddenException('CRE users cannot update candidate status.');
    }

    // Update candidate status
    const updatedCandidate = await this.prisma.candidate.update({
      where: { id: candidateId },
      data: {
        currentStatusId: updateStatusDto.currentStatusId,
        onHoldDuration: updateStatusDto.onHoldDurationDays ?? null,
        onHoldUntil: updateStatusDto.onHoldUntil ? new Date(updateStatusDto.onHoldUntil) : null,
        futureDate: updateStatusDto.futureDate ? new Date(updateStatusDto.futureDate) : null,
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
    const statusHistoryPayload: any = {
      candidateId: candidateId,
      changedById: user?.id,
      changedByName: user?.name ?? "System", // fallback if user null
      statusId: status.id,
      statusNameSnapshot: status.statusName, // snapshot for history
      statusUpdatedAt: new Date(),
      notificationCount: 0,
      reason: updateStatusDto.reason, // Save reason for status change
      onHoldDurationDays: updateStatusDto.onHoldDurationDays ?? null,
      futureYear: updateStatusDto.futureYear ?? null,
    };

    const statusHistory = await this.prisma.candidateStatusHistory.create({
      data: statusHistoryPayload,
    });

    // Notify about status update for real-time UI
    await this.outboxService.publishEvent('DataSync', {
      type: 'Candidate',
      candidateId,
      message: `Status updated to ${status.statusName} for ${updatedCandidate.firstName} ${updatedCandidate.lastName}`,
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

    // ===== WHATSAPP NOTIFICATION START =====
    // Send WhatsApp notification to candidate about status change
    try {
      const phoneNumber = this.whatsAppService.validatePhoneNumber(
        updatedCandidate.countryCode,
        updatedCandidate.mobileNumber,
      );

      if (phoneNumber) {
        const candidateName = `${updatedCandidate.firstName} ${updatedCandidate.lastName}`;

        // Only send WhatsApp for specific statuses
        const allowedStatuses = ['Interested', 'Not Interested', 'Qualified', 'Deployed', 'Future'];
        const normalizedStatus = status.statusName; // Match the casing used in seed

        if (allowedStatuses.includes(normalizedStatus)) {
          this.logger.log(
            `Sending WhatsApp notification to candidate ${candidateId} (${phoneNumber}) for status change to ${status.statusName}`,
          );

          // Send WhatsApp notification (non-blocking)
          this.whatsappNotificationService
            .sendCandidateStatusUpdate(
              candidateName,
              phoneNumber,
              status.statusName,
              updateStatusDto.reason,
            )
            .then((result) => {
              if (result.success) {
                this.logger.log(
                  `WhatsApp notification sent successfully to ${phoneNumber}. Message ID: ${result.messageId}`,
                );
              } else {
                this.logger.warn(
                  `WhatsApp notification failed for ${phoneNumber}: ${result.message}`,
                );
              }
            })
            .catch((error) => {
              this.logger.error(
                `Error sending WhatsApp notification to ${phoneNumber}:`,
                error,
              );
            });
        } else {
          this.logger.debug(
            `Skipping WhatsApp notification for status: ${normalizedStatus}`,
          );
        }
      } else {
        this.logger.debug(
          `Skipping WhatsApp notification for candidate ${candidateId} - invalid phone number`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error in WhatsApp notification process for candidate ${candidateId}:`,
        error,
      );
    }
    // ===== WHATSAPP NOTIFICATION END =====

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
    skipNotification: boolean = false,
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
        createdBy: userId,
        reason: assignRecruiterDto.reason,
        assignmentType: assignRecruiterDto.assignmentType || 'manual',
      },
      include: {
        recruiter: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Publish assignment event
    if (!skipNotification) {
      await this.outboxService.publishEvent('CandidateRecruiterAssigned', {
        candidateId,
        recruiterId: assignRecruiterDto.recruiterId,
        assignedBy: userId,
        reason: assignRecruiterDto.reason,
      });
    }

    return {
      message: `Recruiter ${recruiter.name} assigned to candidate`,
      assignment,
    };
  }

  /**
   * Transfer candidate to another recruiter
   * Validates that the candidate is currently assigned and prevents transferring to the same recruiter
   */
  async transferRecruiter(
    candidateId: string,
    transferCandidateDto: TransferCandidateDto,
    userId: string,
  ): Promise<{ message: string; assignment: any }> {
    // Check if candidate exists
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        recruiterAssignments: {
          where: { isActive: true },
          include: {
            recruiter: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    // Get current active assignment
    const currentAssignment = candidate.recruiterAssignments[0];

    // Check if candidate is already assigned to the target recruiter
    if (
      currentAssignment &&
      currentAssignment.recruiterId === transferCandidateDto.targetRecruiterId
    ) {
      throw new BadRequestException(
        `Candidate is already assigned to recruiter ${currentAssignment.recruiter.name}`,
      );
    }

    // Check if target recruiter exists
    const targetRecruiter = await this.prisma.user.findUnique({
      where: { id: transferCandidateDto.targetRecruiterId },
    });

    if (!targetRecruiter) {
      throw new NotFoundException(
        `Target recruiter with ID ${transferCandidateDto.targetRecruiterId} not found`,
      );
    }

    // Use the existing assignRecruiter method to handle the transfer (skip generic notification)
    const result = await this.assignRecruiter(
      candidateId,
      {
        recruiterId: transferCandidateDto.targetRecruiterId,
        reason:
          transferCandidateDto.reason ||
          `Transferred from ${currentAssignment ? currentAssignment.recruiter.name : 'unassigned'}`,
      },
      userId,
      true, // skipNotification — we publish CandidateTransferred below
    );

    // Publish transfer-specific notification event
    await this.outboxService.publishEvent('CandidateTransferred', {
      candidateId,
      targetRecruiterId: transferCandidateDto.targetRecruiterId,
      transferredBy: userId,
      reason: transferCandidateDto.reason || '',
      previousRecruiterId: currentAssignment?.recruiterId ?? null,
    });

    return {
      message: `Candidate transferred from ${currentAssignment ? currentAssignment.recruiter.name : 'unassigned'} to ${targetRecruiter.name}`,
      assignment: result.assignment,
    };
  }

  /**
   * Bulk transfer multiple candidates to a new recruiter
   */
  async bulkTransferRecruiter(
    dto: BulkTransferCandidateDto,
    userId: string,
  ): Promise<{ message: string; transferred: number; skipped: string[] }> {
    // Verify target recruiter exists once
    const targetRecruiter = await this.prisma.user.findUnique({
      where: { id: dto.targetRecruiterId },
    });

    if (!targetRecruiter) {
      throw new NotFoundException(
        `Target recruiter with ID ${dto.targetRecruiterId} not found`,
      );
    }

    let transferred = 0;
    const skipped: string[] = [];

    for (const candidateId of dto.candidateIds) {
      try {
        // Check current assignment
        const candidate = await this.prisma.candidate.findUnique({
          where: { id: candidateId },
          include: {
            recruiterAssignments: {
              where: { isActive: true },
              select: { recruiterId: true },
            },
          },
        });

        if (!candidate) {
          skipped.push(candidateId);
          continue;
        }

        const currentAssignment = candidate.recruiterAssignments[0];
        if (currentAssignment?.recruiterId === dto.targetRecruiterId) {
          skipped.push(candidateId);
          continue;
        }

        await this.assignRecruiter(
          candidateId,
          {
            recruiterId: dto.targetRecruiterId,
            reason: dto.reason || `Bulk transferred to ${targetRecruiter.name}`,
          },
          userId,
          true, // skipNotification — we publish CandidateTransferred below
        );

        // Publish transfer-specific notification event per candidate
        await this.outboxService.publishEvent('CandidateTransferred', {
          candidateId,
          targetRecruiterId: dto.targetRecruiterId,
          transferredBy: userId,
          reason: dto.reason || '',
          previousRecruiterId: currentAssignment?.recruiterId ?? null,
        });

        transferred++;
      } catch {
        skipped.push(candidateId);
      }
    }

    return {
      message: `Bulk transfer complete: ${transferred} transferred, ${skipped.length} skipped`,
      transferred,
      skipped,
    };
  }

  /**
   * Transfer candidate back from CRE to previous recruiter
   */
  async transferBackToPreviousRecruiter(
    candidateId: string,
    userId: string,
  ): Promise<{ message: string; assignment: any }> {
    // 1. Get current assignment and history
    const assignments = await this.prisma.candidateRecruiterAssignment.findMany({
      where: { candidateId },
      orderBy: { assignedAt: 'desc' },
      include: {
        recruiter: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (assignments.length === 0) {
      throw new NotFoundException(
        `No recruiter assignments found for candidate ${candidateId}`,
      );
    }

    const currentAssignment = assignments.find((a) => a.isActive);
    if (!currentAssignment) {
      throw new BadRequestException(
        `Candidate ${candidateId} has no active recruiter assignment`,
      );
    }

    // 2. Find the most recent INACTIVE assignment that is a DIFFERENT recruiter
    const previousAssignment = assignments.find(
      (a) => !a.isActive && a.recruiterId !== currentAssignment.recruiterId,
    );

    if (!previousAssignment) {
      throw new BadRequestException(
        `Candidate ${candidateId} has no previous recruiter assignment to transfer back to`,
      );
    }

    // 3. Perform the transfer back
    const result = await this.assignRecruiter(
      candidateId,
      {
        recruiterId: previousAssignment.recruiterId,
        reason: `Transferred back from ${currentAssignment.recruiter.name} to previous recruiter ${previousAssignment.recruiter.name}`,
      },
      userId,
      true, // Skip generic notification
    );

    // 4. Publish transfer back notification event
    await this.outboxService.publishCandidateTransferredBack(
      candidateId,
      previousAssignment.recruiterId,
      userId,
      `Transferred back from ${currentAssignment.recruiter.name}`,
    );

    return {
      message: `Candidate transferred back to previous recruiter ${previousAssignment.recruiter.name}`,
      assignment: result.assignment,
    };
  }

  /**
   * Get the original recruiter who was first assigned to the candidate
   */
  async getOriginalRecruiter(candidateId: string): Promise<any> {
    const originalAssignment = await this.prisma.candidateRecruiterAssignment.findFirst({
      where: { candidateId },
      orderBy: { assignedAt: 'asc' }, // Get the oldest assignment
      include: {
        recruiter: {
          select: {
            id: true,
            name: true,
            email: true,
            mobileNumber: true,
            countryCode: true,
          },
        },
      },
    });

    if (!originalAssignment) {
      throw new NotFoundException(
        `No recruiter assignment history found for candidate ${candidateId}`,
      );
    }

    return originalAssignment.recruiter;
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

  /**
   * Check if a candidate is currently being handled by a CRE
   * This means they have an active assignment with type CRE_AUTO or CRE_MANUAL
   */
  async isHandledByCRE(candidateId: string): Promise<boolean> {
    const activeCREAssignment = await this.prisma.candidateRecruiterAssignment.findFirst({
      where: {
        candidateId,
        isActive: true,
        assignmentType: {
          in: [CANDIDATE_ASSIGNMENT_TYPE.CRE_AUTO, CANDIDATE_ASSIGNMENT_TYPE.CRE_MANUAL],
        },
      },
    });

    return !!activeCREAssignment;
  }

  /**
   * Convert min/max age to dateOfBirth range for filtering.
   */
  private computeDateOfBirthRangeFromAge(
    minAge?: number,
    maxAge?: number,
  ): { dateOfBirthFrom?: Date; dateOfBirthTo?: Date } {
    if (minAge == null && maxAge == null) return {};

    const now = new Date();
    const range: { dateOfBirthFrom?: Date; dateOfBirthTo?: Date } = {};

    if (maxAge !== undefined && maxAge !== null) {
      const earliest = new Date(now);
      earliest.setFullYear(now.getFullYear() - maxAge);
      earliest.setHours(0, 0, 0, 0);
      range.dateOfBirthFrom = earliest;
    }

    if (minAge !== undefined && minAge !== null) {
      const latest = new Date(now);
      latest.setFullYear(now.getFullYear() - minAge);
      latest.setHours(23, 59, 59, 999);
      range.dateOfBirthTo = latest;
    }

    return range;
  }

  /**
   * Get candidate overview for a specific recruiter or all (admin)
   */
  async getCandidateOverview(
    query: QueryCandidateOverviewDto,
    userId: string,
    roles: string[],
  ): Promise<any> {
    const isManagerOrAdmin = roles.some((role) =>
      ['CEO', 'Director', 'Manager', 'Team Head', 'Team Lead', 'System Admin', 'CRE'].includes(role),
    );

    const isRecruiter = roles.includes('Recruiter');

    // If a specific recruiter ID is passed and requester is manager/admin/cre, use it.
    // Otherwise, if recruiter, force filter by their ID.
    // If it's none of above, could be something else, default to all for now.
    let targetRecruiterId = query.recruiterId;

    if (isRecruiter) {
      targetRecruiterId = userId;
    }

    const where: any = {};

    // Base filter for list and counts: candidates assigned to the recruiter
    if (targetRecruiterId && targetRecruiterId !== 'all') {
      where.recruiterAssignments = {
        some: {
          recruiterId: targetRecruiterId,
          isActive: true,
        },
      };
    }

    // Date Range logic
    if (query.dateFilter && query.dateFilter !== 'custom' && query.dateFilter !== 'all') {
      const now = new Date();
      let start: Date | undefined;
      let end: Date | undefined;

      switch (query.dateFilter) {
        case 'today':
          start = new Date(new Date().setHours(0, 0, 0, 0));
          end = new Date(new Date().setHours(23, 59, 59, 999));
          break;
        case 'yesterday':
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          start = new Date(yesterday.setHours(0, 0, 0, 0));
          end = new Date(yesterday.setHours(23, 59, 59, 999));
          break;
        case 'this_week':
          const first = now.getDate() - now.getDay();
          const sunday = new Date(new Date().setDate(first));
          start = new Date(sunday.setHours(0, 0, 0, 0));
          end = new Date();
          end.setHours(23, 59, 59, 999);
          break;
        case 'last_week':
          const lastFirst = now.getDate() - now.getDay() - 7;
          const lastSunday = new Date(new Date().setDate(lastFirst));
          start = new Date(lastSunday.setHours(0, 0, 0, 0));
          end = new Date(start);
          end.setDate(start.getDate() + 6);
          end.setHours(23, 59, 59, 999);
          break;
        case 'this_month':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date();
          end.setHours(23, 59, 59, 999);
          break;
        case 'this_year':
          start = new Date(now.getFullYear(), 0, 1);
          end = new Date();
          end.setHours(23, 59, 59, 999);
          break;
      }
      if (start && end) {
        where.createdAt = { gte: start, lte: end };
      }
    } else if (query.dateFrom || query.dateTo) {
      const dateRange: any = {};
      if (query.dateFrom) dateRange.gte = new Date(query.dateFrom);
      if (query.dateTo) dateRange.lte = new Date(query.dateTo);
      where.createdAt = dateRange;
    }

    // Add list filters
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { candidateCode: { contains: query.search, mode: 'insensitive' } },
        { mobileNumber: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.gender) {
      where.gender = query.gender.toUpperCase();
    }

    if (query.sources && query.sources.length > 0) {
      where.source = { in: query.sources };
    } else if (query.source) {
      where.source = query.source;
    }

    if (query.countryPreferences && query.countryPreferences.length > 0) {
      where.preferredCountries = { some: { countryCode: { in: query.countryPreferences } } };
    }

    if (query.sectorTypes && query.sectorTypes.length > 0) {
      where.sectorType = { in: query.sectorTypes };
    }

    if (query.facilityPreferences && query.facilityPreferences.length > 0) {
      where.facilityPreferences = { some: { facilityType: { in: query.facilityPreferences } } };
    }

    if (query.visaType) {
      where.visaType = query.visaType;
    }

    if (query.qualification) {
      where.qualifications = {
        some: {
          qualification: {
            name: { contains: query.qualification, mode: 'insensitive' },
          },
        },
      };
    }

    if (query.minExperience !== undefined || query.maxExperience !== undefined) {
      where.experience = {};
      if (query.minExperience !== undefined) where.experience.gte = query.minExperience;
      if (query.maxExperience !== undefined) where.experience.lte = query.maxExperience;
    }

    if (query.minSalary !== undefined || query.maxSalary !== undefined) {
      where.expectedMinSalary = {};
      if (query.minSalary !== undefined) where.expectedMinSalary.gte = query.minSalary;
      if (query.maxSalary !== undefined) where.expectedMinSalary.lte = query.maxSalary;
    }

    if (query.agentId) {
      where.agentId = query.agentId;
    }

    if (query.heightMin !== undefined || query.heightMax !== undefined) {
      where.height = {};
      if (query.heightMin !== undefined) where.height.gte = query.heightMin;
      if (query.heightMax !== undefined) where.height.lte = query.heightMax;
    }

    if (query.weightMin !== undefined || query.weightMax !== undefined) {
      where.weight = {};
      if (query.weightMin !== undefined) where.weight.gte = query.weightMin;
      if (query.weightMax !== undefined) where.weight.lte = query.weightMax;
    }

    if (query.skinTone) {
      where.skinTone = query.skinTone;
    }

    if (query.languageProficiency) {
      where.languageProficiency = { contains: query.languageProficiency, mode: 'insensitive' };
    }

    if (query.smartness) {
      where.smartness = query.smartness;
    }

    if (query.licensingExam) {
      where.licensingExam = query.licensingExam;
    }

    if (query.dataFlow !== undefined) {
      where.dataFlow = query.dataFlow;
    }

    if (query.eligibility !== undefined) {
      where.eligibility = query.eligibility;
    }

    // Age filter is converted to dateOfBirth filter range
    const ageDobRange = this.computeDateOfBirthRangeFromAge(query.minAge, query.maxAge);
    if (ageDobRange.dateOfBirthFrom || ageDobRange.dateOfBirthTo) {
      where.dateOfBirth = {};
      if (ageDobRange.dateOfBirthFrom) {
        where.dateOfBirth.gte = ageDobRange.dateOfBirthFrom;
      }
      if (ageDobRange.dateOfBirthTo) {
        where.dateOfBirth.lte = ageDobRange.dateOfBirthTo;
      }
    }

    if (query.dateOfBirthFrom || query.dateOfBirthTo) {
      if (!where.dateOfBirth) {
        where.dateOfBirth = {};
      }
      if (query.dateOfBirthFrom) {
        const parsedFrom = new Date(query.dateOfBirthFrom);
        where.dateOfBirth.gte = where.dateOfBirth.gte
          ? new Date(Math.max(new Date(where.dateOfBirth.gte).getTime(), parsedFrom.getTime()))
          : parsedFrom;
      }
      if (query.dateOfBirthTo) {
        const parsedTo = new Date(query.dateOfBirthTo);
        const toDate = new Date(parsedTo);
        toDate.setHours(23, 59, 59, 999);
        where.dateOfBirth.lte = where.dateOfBirth.lte
          ? new Date(Math.min(new Date(where.dateOfBirth.lte).getTime(), toDate.getTime()))
          : toDate;
      }
    }

    if (query.workExperienceCompany || query.workExperienceTitle) {
      const workExperienceCondition: any = {};
      if (query.workExperienceCompany) {
        workExperienceCondition.companyName = { contains: query.workExperienceCompany, mode: 'insensitive' };
      }
      if (query.workExperienceTitle) {
        workExperienceCondition.jobTitle = { contains: query.workExperienceTitle, mode: 'insensitive' };
      }
      where.workExperiences = { some: workExperienceCondition };
    }

    // New: Main and Sub Status filtering
    if (query.mainStatus || query.subStatus) {
      if (!where.projects) {
        where.projects = {
          some: {
            ...(query.mainStatus ? { mainStatus: { name: query.mainStatus } } : {}),
            ...(query.subStatus ? { subStatus: { name: query.subStatus } } : {}),
          },
        };
      } else if (where.projects.some) {
        // Merge with existing projects.some filters
        where.projects.some = {
          ...where.projects.some,
          ...(query.mainStatus ? { mainStatus: { name: query.mainStatus } } : {}),
          ...(query.subStatus ? { subStatus: { name: query.subStatus } } : {}),
        };
      }
    }

    if (query.processingStep) {
      where.projects = {
        some: {
          processing: {
            processingSteps: {
              some: {
                template: { key: query.processingStep },
                status: 'completed',
              },
            },
          },
        },
      };
    }

    if (query.currentStatus || query.status) {
      const rawStatus = query.currentStatus || query.status;
      const statusValue = rawStatus ? rawStatus.toLowerCase() : '';

      if (statusValue === 'registered' || statusValue === 'nominated') {
        where.projects = {
          some: {
            ...(query.subStatus ? { subStatus: { name: query.subStatus } } : {}),
          },
        };
      } else if (statusValue === 'positive') {
        where.currentStatus = {
          statusName: { in: ['Interested', 'Future', 'On Hold'] },
        };
        where.projects = { none: {} };
      } else if (statusValue === 'negative') {
        where.currentStatus = {
          statusName: {
            in: ['Not Interested', 'Other Enquiry', 'RNR', 'Not Eligible'],
          },
        };
        where.projects = { none: {} };
      } else if (statusValue === 'documentation') {
        where.projects = {
          some: {
            mainStatus: { name: 'documents' },
            ...(query.subStatus ? { subStatus: { name: query.subStatus } } : {}),
          },
        };
      } else if (statusValue === 'interview') {
        where.projects = {
          some: {
            mainStatus: { name: 'interview' },
            ...(query.subStatus ? { subStatus: { name: query.subStatus } } : {}),
          },
        };
      } else if (statusValue === 'processing') {
        where.projects = {
          some: {
            mainStatus: { name: 'processing' },
            ...(query.subStatus ? { subStatus: { name: query.subStatus } } : {}),
          },
        };
      } else if (statusValue === 'deployed') {
        where.OR = [
          { currentStatus: { statusName: 'Deployed' } },
          { projects: { some: { subStatus: { name: 'hired' } } } },
        ];
      } else if (statusValue === 'interested' || statusValue === 'qualified') {
        where.OR = [
          { currentStatus: { statusName: { in: ['Interested', 'Qualified', 'Deployed'] } } },
          { projects: { some: {} } },
        ];
      } else if ([
        'untouched', 'not_interested', 'not_eligible', 'other_enquiry', 'future', 'on_hold', 'rnr'
      ].includes(statusValue)) {
        where.currentStatus = {
          statusName: {
            in: ['Untouched', 'Not Interested', 'Not Eligible', 'Other Enquiry', 'Future', 'On Hold', 'RNR'],
          },
        };
        where.projects = { none: {} };
      } else if (statusValue === 'interview_assigned') {
        // Updated logic: Filter by candidates who have EVER been in specific interview sub-statuses
        where.projects = {
          some: {
            projectStatusHistory: {
              some: {
                subStatus: {
                  name: {
                    in: [
                      'interview_assigned',
                      'interview_scheduled',
                      'interview_rescheduled',
                      'interview_completed',
                      'interview_passed',
                      'shortlisted',
                    ],
                  },
                },
              },
            },
          },
        };
      } else if (statusValue === 'document_received') {
        where.projects = {
          some: {
            processing: {
              processingSteps: {
                some: {
                  template: { key: 'document_received' },
                  status: 'completed',
                },
              },
            },
          },
        };
      } else if (statusValue === 'medical') {
        where.projects = {
          some: {
            processing: {
              processingSteps: {
                some: {
                  template: { key: 'medical' },
                  status: 'completed',
                },
              },
            },
          },
        };
      } else if (statusValue === 'visa') {
        where.projects = {
          some: {
            processing: {
              processingSteps: {
                some: {
                  template: { key: 'visa' },
                  status: 'completed',
                },
              },
            },
          },
        };
      } else {
        where.currentStatus = { statusName: { contains: statusValue, mode: 'insensitive' } };
      }
    }

    // Common query options for counts
    // We create a base where clause that EXCLUDES the status/currentStatus filters
    // so that clicking a tile doesn't recalculate the other tiles based on the filtered list.
    const baseWhereForCounts = { ...where };
    delete baseWhereForCounts.OR;
    delete baseWhereForCounts.currentStatus;
    delete baseWhereForCounts.status; // Fixed: also delete status from base count where
    delete baseWhereForCounts.mainStatus;
    delete baseWhereForCounts.subStatus;
    delete baseWhereForCounts.processingStep;

    // Also remove projects filter if it was added for specific status filtering
    if (query.currentStatus || query.status || query.mainStatus || query.subStatus || query.processingStep) {
      delete baseWhereForCounts.projects;
    }

    // Optimized summary counts using Promise.all
    const [
      tableTotalCount,
      totalCandidatesCount,
      positiveCandidates,
      negativeCandidates,
      registeredCandidates,
      documentationCandidates,
      interviewCandidates,
      processingCandidates,
      deployedCandidatesCount,
      interviewAssignedCandidates,
      docReceivedCandidates,
      medicalCandidates,
      visaCandidates
    ] = await Promise.all([
      // 1. Total (Filtered for table)
      this.prisma.candidate.count({ where }),

      // 2. Total Summary (Filtered for context)
      this.prisma.candidate.count({ where: baseWhereForCounts }),

      // 3. Positive ('Interested', 'Future', 'On Hold' AND NOT nominated)
      this.prisma.candidate.count({
        where: {
          ...baseWhereForCounts,
          currentStatus: { statusName: { in: ['Interested', 'Future', 'On Hold'] } },
          projects: { none: {} },
        },
      }),

      // 4. Negative ('Not Interested', 'Other Enquiry', 'RNR', 'Not Eligible' AND NOT nominated)
      this.prisma.candidate.count({
        where: {
          ...baseWhereForCounts,
          currentStatus: {
            statusName: {
              in: [
                'Not Interested',
                'Other Enquiry',
                'RNR',
                'Not Eligible',
              ],
            },
          },
          projects: { none: {} },
        },
      }),

      // 5. Registered / Nominated
      this.prisma.candidate.count({
        where: {
          ...baseWhereForCounts,
          projects: { some: {} },
        },
      }),

      // 6. Documentation
      this.prisma.candidate.count({
        where: {
          ...baseWhereForCounts,
          projects: { some: { mainStatus: { name: 'documents' } } },
        },
      }),

      // 7. Interview
      this.prisma.candidate.count({
        where: {
          ...baseWhereForCounts,
          projects: { some: { mainStatus: { name: 'interview' } } },
        },
      }),

      // 8. Processing
      this.prisma.candidate.count({
        where: {
          ...baseWhereForCounts,
          projects: { some: { mainStatus: { name: 'processing' } } },
        },
      }),

      // 9. Deployed
      this.prisma.candidate.count({
        where: {
          ...baseWhereForCounts,
          OR: [
            { currentStatus: { statusName: 'Deployed' } },
            { projects: { some: { subStatus: { name: 'hired' } } } },
          ],
        },
      }),

      // 10. Interview Assigned
      this.prisma.candidate.count({
        where: {
          ...baseWhereForCounts,
          projects: {
            some: {
              ...(targetRecruiterId ? { recruiterId: targetRecruiterId } : {}),
              projectStatusHistory: {
                some: {
                  subStatus: {
                    name: {
                      in: [
                        'interview_assigned',
                        'interview_scheduled',
                        'interview_rescheduled',
                        'interview_completed',
                        'interview_passed',
                        'shortlisted',
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      }),

      // 11. Documents Received
      this.prisma.candidate.count({
        where: {
          ...baseWhereForCounts,
          projects: {
            some: {
              ...(targetRecruiterId ? { recruiterId: targetRecruiterId } : {}),
              processing: {
                processingSteps: {
                  some: {
                    template: { key: 'document_received' },
                    status: 'completed',
                  },
                },
              },
            },
          },
        },
      }),

      // 12. Medical
      this.prisma.candidate.count({
        where: {
          ...baseWhereForCounts,
          projects: {
            some: {
              ...(targetRecruiterId ? { recruiterId: targetRecruiterId } : {}),
              processing: {
                processingSteps: {
                  some: {
                    template: { key: 'medical' },
                    status: 'completed',
                  },
                },
              },
            },
          },
        },
      }),

      // 13. Visa
      this.prisma.candidate.count({
        where: {
          ...baseWhereForCounts,
          projects: {
            some: {
              ...(targetRecruiterId ? { recruiterId: targetRecruiterId } : {}),
              processing: {
                processingSteps: {
                  some: {
                    template: { key: 'visa' },
                    status: 'completed',
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    // Pagination for the table
    const page = query.page || 1;
    const limit = query.limit || 10;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const skip = (page - 1) * limit;

    // Define the projects filtering based on current status/mainStatus
    let projectsFilter: any = undefined;
    const statusValue = (query.currentStatus || query.status || '').toLowerCase();

    if (query.mainStatus || query.subStatus) {
      projectsFilter = {
        where: {
          ...(query.mainStatus ? { mainStatus: { name: query.mainStatus } } : {}),
          ...(query.subStatus ? { subStatus: { name: query.subStatus } } : {}),
        },
      };
    } else if (statusValue === 'interview') {
      projectsFilter = { where: { mainStatus: { name: 'interview' } } };
    } else if (statusValue === 'documentation') {
      projectsFilter = { where: { mainStatus: { name: 'documents' } } };
    } else if (statusValue === 'processing') {
      projectsFilter = { where: { mainStatus: { name: 'processing' } } };
    } else if (statusValue === 'registered' || statusValue === 'nominated') {
      projectsFilter = { where: {} }; // Show any project
    } else if (statusValue === 'interview_assigned') {
      projectsFilter = {
        where: {
          projectStatusHistory: {
            some: {
              subStatus: {
                name: {
                  in: [
                    'interview_assigned',
                    'interview_scheduled',
                    'interview_rescheduled',
                    'interview_completed',
                    'interview_passed',
                    'shortlisted',
                  ],
                },
              },
            },
          },
        },
      };
    }

    const candidatesData = await this.prisma.candidate.findMany({
      where,
      include: {
        currentStatus: true,
        team: true,
        preferredCountries: {
          include: { country: true },
        },
        _count: {
          select: {
            projects: projectsFilter ? projectsFilter : true,
          },
        },
        projects: projectsFilter ? {
          ...projectsFilter,
          include: {
            subStatus: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        } : {
          include: {
            subStatus: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        recruiterAssignments: {
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
            createdByUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        documents: {
          where: { isDeleted: false },
          select: { docType: true },
        },
      },
      orderBy: { [sortBy as string]: sortOrder },
      skip,
      take: limit,
    });

    const candidates = candidatesData.map((c) => {
      const activeAssignment = c.recruiterAssignments?.find((a) => a.isActive);
      const firstAssignment = c.recruiterAssignments?.[0]; // The one who created the first engagement
      const latestProject = c.projects?.[0] as any;
      
      // Destructure to remove projects array from the final response object
      const { projects, documents, ...candidateRest } = c as typeof c & {
        documents?: Array<{ docType: string }>;
      };

      const withCompletion = withProfileCompletion({
        ...candidateRest,
        documents: documents ?? [],
      });

      return {
        ...withCompletion,
        recruiter: activeAssignment?.recruiter || null,
        createdBy:
          firstAssignment?.createdByUser ||
          firstAssignment?.assignedByUser ||
          null,
        projectDetails: latestProject
          ? {
              id: latestProject.id,
              projectId: latestProject.projectId,
              subStatus: latestProject.subStatus?.label || latestProject.subStatus?.name || null,
            }
          : null,
      };
    });

    return {
      candidates,
      pagination: {
        page,
        limit,
        total: tableTotalCount,
        totalPages: Math.ceil(tableTotalCount / limit),
      },
      stats: {
        total: totalCandidatesCount,
        positive: positiveCandidates,
        negative: negativeCandidates,
        nominated: registeredCandidates, // Renamed for front end compatibility while keeping key name if needed
        registered: registeredCandidates,
        documentation: documentationCandidates,
        interview: interviewCandidates,
        processing: processingCandidates,
        interviewAssigned: interviewAssignedCandidates,
        documentReceived: docReceivedCandidates,
        medical: medicalCandidates,
        visa: visaCandidates,
        deployed: deployedCandidatesCount,
      },
    };
  }

  /**
   * Get consolidated project workflow details for a candidate
   * Includes documentation, interviews, and processing details for all projects
   */
  async getCandidateProjectsWorkflowDetails(
    candidateId: string,
    options: { subStatus?: string; search?: string; page?: number; limit?: number } = {},
  ) {
    const { subStatus, search, page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const candidateInfo = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profileImage: true,
      },
    });

    if (!candidateInfo) {
      return null;
    }

    const projectWhere: any = {
      candidateId,
    };

    if (subStatus) {
      projectWhere.subStatusId = subStatus;
    }

    if (search) {
      projectWhere.OR = [
        {
          project: {
            title: { contains: search, mode: 'insensitive' },
          },
        },
        {
          project: {
            client: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
        },
        {
          roleNeeded: {
            designation: { contains: search, mode: 'insensitive' },
          },
        },
        {
          roleNeeded: {
            roleCatalog: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const totalProjects = await this.prisma.candidateProjects.count({
      where: projectWhere,
    });

    const projects = await this.prisma.candidateProjects.findMany({
      where: projectWhere,
      include: {
        project: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                pointOfContact: true,
                email: true,
                phone: true,
              },
            },
            country: true,
          },
        },
        roleNeeded: {
          select: {
            designation: true,
            roleCatalog: {
              select: {
                name: true,
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
        mainStatus: true,
        subStatus: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const roleMap: Record<string, any> = {};
    const projectRoles = (projects as any[])
      .map((p) => (p as any).roleNeeded)
      .filter((role) => !!role)
      .reduce((acc: any[], role: any) => {
        if (!roleMap[role.id]) {
          roleMap[role.id] = true;
          acc.push(role);
        }
        return acc;
      }, []);

    return {
      candidate: candidateInfo,
      projects,
      candidateProjects: projects,
      projectRoles,
      pagination: {
        total: totalProjects,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(totalProjects / limit)),
      },
    };
  }

  /**
   * Get documentation-specific workflow details for a candidate
   * Includes only project info and document verifications
   */
  async getCandidateDocumentationWorkflow(
    candidateId: string,
    options: { subStatus?: string; search?: string; page?: number; limit?: number } = {},
  ) {
    const { subStatus, search, page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    // First find the candidate details
    const candidateInfo = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profileImage: true,
      },
    });

    if (!candidateInfo) return null;

    // Define where clause for filtering projects
    const projectWhere: any = {
      candidateId,
      mainStatus: {
        name: {
          equals: 'documents',
          mode: 'insensitive',
        },
      },
    };

    if (subStatus) {
      projectWhere.subStatusId = subStatus;
    }

    if (search) {
      projectWhere.project = {
        title: {
          contains: search,
          mode: 'insensitive',
        },
      };
    }

    // Get total count for pagination
    const totalProjects = await this.prisma.candidateProjects.count({
      where: projectWhere,
    });

    // Get paginated projects with details
    const projects = await this.prisma.candidateProjects.findMany({
      where: projectWhere,
      include: {
        project: {
          include: {
            client: true,
            country: true,
          },
        },
        roleNeeded: {
          select: {
            designation: true,
            roleCatalog: {
              select: {
                name: true,
              },
            },
          },
        },
        mainStatus: true,
        subStatus: true,
        documentVerifications: {
          include: {
            document: {
              include: {
                candidate: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            verificationHistory: {
              include: {
                performer: {
                  select: { 
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
              orderBy: { performedAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // Fetch user information for uploadedBy and verifiedBy
    const userIds = new Set<string>();
    projects.forEach(p => {
      p.documentVerifications?.forEach(dv => {
        if (dv.document.uploadedBy) userIds.add(dv.document.uploadedBy);
        if (dv.document.verifiedBy) userIds.add(dv.document.verifiedBy);
        if (dv.document.rejectedBy) userIds.add(dv.document.rejectedBy);
      });
    });

    const users = userIds.size > 0 
      ? await this.prisma.user.findMany({
          where: { id: { in: Array.from(userIds) } },
          select: { id: true, name: true, email: true }
        })
      : [];
    
    const userMap = users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<string, any>);

    // Attach user details to documents
    const projectsWithUserDetails = projects.map(p => ({
      ...p,
      documentVerifications: p.documentVerifications?.map(dv => ({
        ...dv,
        document: {
          ...dv.document,
          uploader: dv.document.uploadedBy ? userMap[dv.document.uploadedBy] : null,
          verifier: dv.document.verifiedBy ? userMap[dv.document.verifiedBy] : null,
          rejector: dv.document.rejectedBy ? userMap[dv.document.rejectedBy] : null,
        }
      }))
    }));

    return {
      candidate: candidateInfo,
      projects: projectsWithUserDetails,
      pagination: {
        total: totalProjects,
        page,
        limit,
        totalPages: Math.ceil(totalProjects / limit),
      },
    };
  }

  /**
   * Get interview-specific workflow details for a candidate
   * Includes only project info, screenings, and interviews
   */
  async getCandidateInterviewWorkflow(
    candidateId: string,
    options: { subStatus?: string; search?: string; page?: number; limit?: number } = {},
  ) {
    const { subStatus, search, page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    // First find the candidate details
    const candidateInfo = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profileImage: true,
      },
    });

    if (!candidateInfo) return null;

    // Define where clause for filtering projects
    const projectWhere: any = {
      candidateId,
      mainStatus: {
        name: {
          equals: 'interview',
          mode: 'insensitive',
        },
      },
    };

    if (subStatus) {
      projectWhere.subStatusId = subStatus;
    }

    if (search) {
      projectWhere.project = {
        title: {
          contains: search,
          mode: 'insensitive',
        },
      };
    }

    // Get total count for pagination
    const totalProjects = await this.prisma.candidateProjects.count({
      where: projectWhere,
    });

    // Get paginated projects with details
    const projects = await this.prisma.candidateProjects.findMany({
      where: projectWhere,
      include: {
        project: {
          include: {
            client: true,
            country: true,
          },
        },
        roleNeeded: {
          select: {
            designation: true,
            roleCatalog: {
              select: {
                name: true,
              },
            },
          },
        },
        mainStatus: true,
        subStatus: true,
        screenings: {
          include: {
            checklistItems: true,
            template: true,
            candidateProjectMap: {
              select: {
                id: true,
                project: { select: { title: true } },
                candidate: { select: { firstName: true, lastName: true } },
              },
            },
          },
          orderBy: { scheduledTime: 'desc' },
        },
        interviews: {
          include: {
            candidateProjectMap: {
              select: {
                id: true,
                project: { select: { title: true } },
                candidate: { select: { firstName: true, lastName: true } },
              },
            },
          },
          orderBy: { scheduledTime: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // For each screening and interview, fetch who scheduled it from InterviewStatusHistory
    const projectsWithSchedulingInfo = await Promise.all(
      projects.map(async (project) => {
        const screeningsWithScheduler = await Promise.all(
          project.screenings.map(async (screening) => {
            const history = await this.prisma.interviewStatusHistory.findFirst({
              where: {
                interviewId: screening.id,
                interviewType: 'screening',
                status: 'scheduled',
              },
              orderBy: { statusAt: 'asc' },
              include: { changedBy: { select: { id: true, name: true, profileImage: true } } },
            });
            return {
              ...screening,
              scheduledBy: history?.changedBy || (history?.changedByName ? { name: history.changedByName } : null),
            };
          }),
        );

        const interviewsWithScheduler = await Promise.all(
          project.interviews.map(async (interview) => {
            const history = await this.prisma.interviewStatusHistory.findFirst({
              where: {
                interviewId: interview.id,
                interviewType: 'client',
                status: 'scheduled',
              },
              orderBy: { statusAt: 'asc' },
              include: { changedBy: { select: { id: true, name: true, profileImage: true } } },
            });
            return {
              ...interview,
              scheduledBy: history?.changedBy || (history?.changedByName ? { name: history.changedByName } : null),
            };
          }),
        );

        return {
          ...project,
          screenings: screeningsWithScheduler,
          interviews: interviewsWithScheduler,
        };
      }),
    );

    return {
      candidate: candidateInfo,
      projects: projectsWithSchedulingInfo,
      pagination: {
        total: totalProjects,
        page,
        limit,
        totalPages: Math.ceil(totalProjects / limit),
      },
    };
  }

  /**
   * Get processing-specific workflow details for a candidate
   * Includes only project info, processing steps, and history
   */
  async getCandidateProcessingWorkflow(
    candidateId: string,
    options: { subStatus?: string; search?: string; step?: string; page?: number; limit?: number } = {},
  ) {
    const { subStatus, search, step, page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    // First find the candidate details
    const candidateInfo = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profileImage: true,
      },
    });

    if (!candidateInfo) return null;

    // Define where clause for filtering projects
    const projectWhere: any = {
      candidateId,
      mainStatus: {
        name: {
          equals: 'processing',
          mode: 'insensitive',
        },
      },
    };

    if (subStatus) {
      projectWhere.subStatusId = subStatus;
    }

    if (step) {
      projectWhere.processing = {
        step: {
          contains: step,
          mode: 'insensitive',
        },
      };
    }

    if (search) {
      projectWhere.project = {
        title: {
          contains: search,
          mode: 'insensitive',
        },
      };
    }

    // Get total count for pagination
    const totalProjects = await this.prisma.candidateProjects.count({
      where: projectWhere,
    });

    // Get paginated projects with details
    const projects = await this.prisma.candidateProjects.findMany({
      where: projectWhere,
      include: {
        project: {
          include: {
            client: true,
            country: true,
          },
        },
        roleNeeded: {
          select: {
            designation: true,
            roleCatalog: {
              select: {
                name: true,
              },
            },
          },
        },
        mainStatus: true,
        subStatus: true,
        processing: {
          include: {
            assignedTo: {
              select: {
                id: true,
                name: true,
              },
            },
            processingSteps: {
              select: {
                id: true,
                status: true,
                template: {
                  select: {
                    key: true,
                    label: true,
                    order: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const projectsWithSectorSteps = projects.map((row: any) => {
      if (!row.processing?.processingSteps?.length) {
        return row;
      }
      const sector = row.project?.sector ?? null;
      const allowed = allowedTemplateKeysForSector(sector);
      return {
        ...row,
        processing: {
          ...row.processing,
          processingSteps: row.processing.processingSteps.filter(
            (s: any) =>
              s.template?.key && allowed.has(s.template.key) && s.status !== 'cancelled',
          ),
        },
      };
    });

    return {
      candidate: candidateInfo,
      projects: projectsWithSectorSteps,
      pagination: {
        total: totalProjects,
        page,
        limit,
        totalPages: Math.ceil(totalProjects / limit),
      },
    };
  }
}
