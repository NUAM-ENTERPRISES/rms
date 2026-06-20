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
import { TransferToRecruiterDto } from './dto/transfer-to-recruiter.dto';
import { LogOperationsCallDto } from './dto/log-operations-call.dto';
import { BulkTransferCandidateDto } from './dto/bulk-transfer-candidate.dto';
import { ConsolidatedCandidateQueryDto } from './dto/consolidated-candidate-query.dto';
import { RecruiterAssignmentService } from './services/recruiter-assignment.service';
import { withActiveAccountStatus } from '../users/user-account-status.filter';
import { CandidateCodeService } from './services/candidate-code.service';
import {
  findExistingCandidateByPassport,
  normalizePassportNumber,
  resolvePassportNumberForCandidate,
} from './utils/passport-number.util';
import { syncEligibilityLetterDocumentNumberFromCandidate } from './utils/eligibility-number.util';
import { CandidateListFilterService } from './services/candidate-list-filter.service';
import { allowedTemplateKeysForSector } from '../processing/processing-sector-steps';
import { RnrRemindersService } from '../rnr-reminders/rnr-reminders.service';
import { CallbackRemindersService } from '../callback-reminders/callback-reminders.service';
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
  CRE_REASSIGN_RECRUITER_RETURN_REASON,
  CLIENT_INTERVIEW_SUB_STATUS_NAMES,
  SCREENING_TRAINING_SUB_STATUS_NAMES,
  TRAINING_SUB_STATUS_NAMES,
  OPERATIONS_CALL_OUTCOME,
  OPERATIONS_FOLLOW_UP_STAGE,
  OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE,
  OPERATIONS_WEEK_ONE_WAIT_MS,
  OPERATIONS_WEEK_TWO_WAIT_MS,
  getOperationsStageWaitRemainingMs,
  isAssignedUntouchedDashboardBucket,
  isEligibleForWeekOneDashboardBucket,
  canTransitionStatus,
  requiresCREHandling,
  isCandidateStatusTerminal,
  normalizeCandidateSource,
} from '../common/constants';
import { PERMISSIONS } from '../common/constants/permissions';
import { ROLE_NAMES, isOperationsRole } from '../common/constants/role-ids';
import { canSeeAgentSourcedCandidates } from './candidate-visibility';
import {
  assertPhysicalAddressConsistent,
  mergePhysicalAddress,
} from '../common/address/assert-physical-address';
import {
  assertAgentCandidateLinkedToAgentProject,
  agentSourceConsolidatedCandidateWhere,
} from '../common/agent-project-candidate-scope';
import { assertCandidateNotBlockedForNewProjectAssignment } from '../candidate-projects/utils/processing-assignment-guard';
import {
  computeCandidateProfileCompletion,
  withProfileCompletion,
} from './utils/profile-completion.util';
import { calculateTotalExperienceYears, calculateCareerGaps } from './utils/employment-timeline.util';
import {
  resolveCreHandoffNote,
  resolveCreHandoffStatus,
} from './utils/cre-handoff.util';
import { computeCandidateActivitySnapshot } from './utils/candidate-activity-snapshot.util';
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

/** Recruiter CRM statuses counted as positive (nomination/pipeline does not remove). */
const POSITIVE_CRM_STATUS_NAMES = [
  'Interested',
  'Future',
  'On Hold',
  'Call Back',
  'Qualified',
] as const;

/** CRM statuses excluded from the positive tile. */
const NEGATIVE_CRM_STATUS_NAMES = [
  'Not Interested',
  'Other Enquiry',
  'RNR',
  'Not Eligible',
] as const;

const DEPLOYED_CRM_STATUS_NAMES = ['Deployed'] as const;

/** Document sub-statuses after Send for Verification (excludes pending_documents). */
const REGISTERED_DOC_SUB_STATUSES = [
  'documents_submitted',
  'verification_in_progress_document',
  'documents_verified',
  'client_revision_requested',
  'documents_re_submission_requested',
  'rejected_documents',
  'submitted_to_client',
] as const;

/** Registered dashboard sub-tiles: history-based counts per documents sub-status. */
const REGISTERED_SUB_STATUS_TILES = [
  {
    key: 'send_for_verification',
    subStatusName: 'verification_in_progress_document',
    label: 'Send for Verification',
  },
  {
    key: 'documents_verified',
    subStatusName: 'documents_verified',
    label: 'Document Verified',
  },
  {
    key: 'rejected_documents',
    subStatusName: 'rejected_documents',
    label: 'Documents Rejected',
  },
  {
    key: 'submitted_to_client',
    subStatusName: 'submitted_to_client',
    label: 'Submitted to Client',
  },
] as const;

/** Screening dashboard sub-tiles: history-based counts per screening/training sub-status. */
const SCREENING_SUB_STATUS_TILES = [
  {
    key: 'assigned',
    subStatusName: 'screening_assigned',
    label: 'Assigned',
  },
  {
    key: 'scheduled',
    subStatusName: 'screening_scheduled',
    label: 'Scheduled',
  },
  {
    key: 'completed',
    subStatusName: 'screening_completed',
    label: 'Completed',
  },
  {
    key: 'passed',
    subStatusName: 'screening_passed',
    label: 'Passed',
  },
  {
    key: 'needs_training',
    subStatusName: 'screening_needs_training',
    label: 'Needs Training',
  },
  {
    key: 'on_hold',
    subStatusName: 'screening_on_hold',
    label: 'On Hold',
  },
  {
    key: 'failed',
    subStatusName: 'screening_failed',
    label: 'Failed',
  },
] as const;

/** Interview dashboard sub-tiles: history-based counts per interview sub-status. */
const INTERVIEW_SUB_STATUS_TILES = [
  {
    key: 'shortlisted',
    subStatusName: 'shortlisted',
    label: 'Shortlisted',
  },
  {
    key: 'not_shortlisted',
    subStatusName: 'not_shortlisted',
    label: 'Not Shortlisted',
  },
  {
    key: 'scheduled',
    subStatusName: 'interview_scheduled',
    label: 'Scheduled',
  },
  {
    key: 'completed',
    subStatusName: 'interview_completed',
    label: 'Completed',
  },
  {
    key: 'passed',
    subStatusName: 'interview_passed',
    label: 'Passed',
  },
  {
    key: 'failed',
    subStatusName: 'interview_failed',
    label: 'Failed',
  },
] as const;

/** Processing dashboard sub-tiles: history-based counts per processing sub-status. */
const PROCESSING_SUB_STATUS_TILES = [
  {
    key: 'transferred',
    subStatusName: 'transfered_to_processing',
    label: 'Transferred',
  },
  {
    key: 'in_progress',
    subStatusName: 'processing_in_progress',
    label: 'In Progress',
  },
  {
    key: 'completed',
    subStatusName: 'processing_completed',
    label: 'Completed',
  },
  {
    key: 'hold',
    subStatusName: 'processing_hold',
    label: 'Hold',
  },
  {
    key: 'cancelled',
    subStatusName: 'processing_cancelled',
    label: 'Cancelled',
  },
] as const;

@Injectable()
export class CandidatesService {
  private readonly logger = new Logger(CandidatesService.name);

  private async assertValidPreferredRoles(
    roleCatalogIds: string[],
  ): Promise<void> {
    if (!roleCatalogIds.length) return;
    const uniqueIds = [...new Set(roleCatalogIds)];
    const activeRoles = await this.prisma.roleCatalog.findMany({
      where: { id: { in: uniqueIds }, isActive: true },
      select: { id: true },
    });
    if (activeRoles.length !== uniqueIds.length) {
      throw new BadRequestException(
        'One or more preferred roles are invalid or inactive',
      );
    }
  }

  private async assertValidProfessionType(
    professionTypeId: string,
  ): Promise<void> {
    const professionType = await this.prisma.professionType.findFirst({
      where: { id: professionTypeId, isActive: true },
      select: { id: true },
    });
    if (!professionType) {
      throw new BadRequestException('Invalid profession type');
    }
  }

  private async assertValidReligionId(
    religionId?: string | null,
  ): Promise<void> {
    if (!religionId?.trim()) return;
    const religion = await this.prisma.religion.findFirst({
      where: { id: religionId.trim(), isActive: true },
      select: { id: true },
    });
    if (!religion) {
      throw new BadRequestException('Invalid religion selected');
    }
  }

  private assertEligibilityNumberRequired(
    eligibility?: boolean | null,
    eligibilityNumber?: string | null,
  ): void {
    if (eligibility === true && !eligibilityNumber?.trim()) {
      throw new BadRequestException(
        'Eligibility number is required when eligibility is enabled',
      );
    }
  }

  private async resolveCrmStatusIds(
    statusNames: readonly string[],
  ): Promise<number[]> {
    if (!statusNames.length) return [];
    const rows = await this.prisma.candidateStatus.findMany({
      where: {
        OR: statusNames.map((statusName) => ({
          statusName: { equals: statusName, mode: 'insensitive' },
        })),
      },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  private buildPositiveCrmStatusFilter(
    positiveStatusIds: number[],
  ): Prisma.CandidateWhereInput {
    if (positiveStatusIds.length > 0) {
      return {
        OR: [
          { currentStatusId: { in: positiveStatusIds } },
          {
            currentStatus: {
              OR: POSITIVE_CRM_STATUS_NAMES.map((statusName) => ({
                statusName: { equals: statusName, mode: 'insensitive' },
              })),
            },
          },
        ],
      };
    }

    return {
      currentStatus: {
        OR: POSITIVE_CRM_STATUS_NAMES.map((statusName) => ({
          statusName: { equals: statusName, mode: 'insensitive' },
        })),
      },
    };
  }

  private buildRecruiterOverviewScope(
    recruiterId: string,
  ): Prisma.CandidateWhereInput {
    return {
      OR: [
        {
          recruiterAssignments: {
            some: { recruiterId, isActive: true },
          },
        },
        {
          projects: {
            some: { recruiterId },
          },
        },
      ],
    };
  }

  private mergeOverviewWhere(
    base: Prisma.CandidateWhereInput,
    extra?: Prisma.CandidateWhereInput,
  ): Prisma.CandidateWhereInput {
    if (!extra || !Object.keys(extra).length) {
      return base;
    }
    const baseAnd = Array.isArray(base.AND)
      ? base.AND
      : base.AND
        ? [base.AND]
        : [];
    return {
      ...base,
      AND: [...baseAnd, extra],
    };
  }

  /** Clone overview scope before tile filters (preserves Date fields). */
  private cloneOverviewScopeWhere(
    source: Prisma.CandidateWhereInput,
  ): Prisma.CandidateWhereInput {
    const cloned: Prisma.CandidateWhereInput = { ...source };

    if (source.AND) {
      const clauses = Array.isArray(source.AND) ? source.AND : [source.AND];
      cloned.AND = clauses.map((clause) => ({ ...clause }));
    }

    if (source.OR) {
      const clauses = Array.isArray(source.OR) ? source.OR : [source.OR];
      cloned.OR = clauses.map((clause) => ({ ...clause }));
    }

    if (source.createdAt) {
      const createdAt = source.createdAt as Prisma.DateTimeFilter;
      cloned.createdAt = {
        ...(createdAt.gte ? { gte: createdAt.gte } : {}),
        ...(createdAt.lte ? { lte: createdAt.lte } : {}),
      };
    }

    if (source.dateOfBirth) {
      const dateOfBirth = source.dateOfBirth as Prisma.DateTimeFilter;
      cloned.dateOfBirth = {
        ...(dateOfBirth.gte ? { gte: dateOfBirth.gte } : {}),
        ...(dateOfBirth.lte ? { lte: dateOfBirth.lte } : {}),
      };
    }

    return cloned;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly pipelineService: PipelineService,
    private readonly eligibilityService: UnifiedEligibilityService,
    private readonly recruiterAssignmentService: RecruiterAssignmentService,
    private readonly candidateCodeService: CandidateCodeService,
    private readonly candidateListFilterService: CandidateListFilterService,
    private readonly rnrRemindersService: RnrRemindersService,
    private readonly callbackRemindersService: CallbackRemindersService,
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


  async lookupByPassport(passportNumber: string): Promise<{
    found: boolean;
    candidate?: {
      id: string;
      candidateCode: string | null;
      firstName: string;
      lastName: string;
      email: string | null;
      countryCode: string | null;
      mobileNumber: string | null;
    };
  }> {
    const existing = await findExistingCandidateByPassport(
      this.prisma,
      passportNumber,
    );
    if (!existing) {
      return { found: false };
    }
    return {
      found: true,
      candidate: {
        id: existing.id,
        candidateCode: existing.candidateCode,
        firstName: existing.firstName,
        lastName: existing.lastName,
        email: existing.email,
        countryCode: existing.countryCode,
        mobileNumber: existing.mobileNumber,
      },
    };
  }

  async create(
    createCandidateDto: CreateCandidateDto,
    userId: string,
  ): Promise<CandidateWithRelations> {
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

    const isAgentCoordinator = Boolean(
      creatingUser?.userRoles.some(
        (ur) =>
          ur.role?.name?.toLowerCase() ===
          ROLE_NAMES.AGENT_COORDINATOR.toLowerCase(),
      ),
    );

    const countryCode = createCandidateDto.countryCode?.trim() || undefined;
    const mobileNumber = createCandidateDto.mobileNumber?.trim() || undefined;
    const hasPhone = Boolean(countryCode && mobileNumber);
    const hasPartialPhone = Boolean(countryCode || mobileNumber) && !hasPhone;

    if (isAgentCoordinator) {
      const normalizedPassport = normalizePassportNumber(
        createCandidateDto.passportNumber,
      );
      if (!normalizedPassport || normalizedPassport.length < 3) {
        throw new BadRequestException(
          'Passport number is required for agent coordinator candidate creation',
        );
      }
      if (hasPartialPhone) {
        throw new BadRequestException(
          'Provide both country code and mobile number, or leave contact empty',
        );
      }
      const passportConflict = await findExistingCandidateByPassport(
        this.prisma,
        normalizedPassport,
      );
      if (passportConflict) {
        throw new ConflictException(
          `Candidate with passport number ${normalizedPassport} already exists`,
        );
      }
    } else if (!hasPhone) {
      throw new BadRequestException(
        'Country code and mobile number are required',
      );
    }

    if (hasPhone) {
      const existingByPhone = await this.prisma.candidate.findUnique({
        where: {
          countryCode_mobileNumber: {
            countryCode: countryCode!,
            mobileNumber: mobileNumber!,
          },
        },
      });
      if (existingByPhone) {
        throw new ConflictException(
          `Candidate with contact ${countryCode}${mobileNumber} already exists`,
        );
      }
    }

    const resolvedPassportNumber = isAgentCoordinator
      ? normalizePassportNumber(createCandidateDto.passportNumber)!
      : normalizePassportNumber(createCandidateDto.passportNumber) ?? undefined;

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

    if (createCandidateDto.preferredRoles?.length) {
      await this.assertValidPreferredRoles(createCandidateDto.preferredRoles);
    }

    await this.assertValidProfessionType(createCandidateDto.professionTypeId);
    await this.assertValidReligionId(createCandidateDto.religionId);
    this.assertEligibilityNumberRequired(
      createCandidateDto.eligibility,
      createCandidateDto.eligibilityNumber,
    );

    // Calculate total experience from work experiences if provided
    const calculatedExperience = createCandidateDto.workExperiences && createCandidateDto.workExperiences.length > 0
      ? calculateTotalExperienceYears(createCandidateDto.workExperiences)
      : 0;

    // Use provided totalExperience or calculated value
    const totalExperience = createCandidateDto.totalExperience ?? calculatedExperience;

    this.logger.log(`Calculated experience: ${calculatedExperience}, Final totalExperience: ${totalExperience}`);

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
    let defaultStatusId = createCandidateDto.currentStatusId ?? 1;
    if (isAgentCoordinator && createCandidateDto.currentStatusId == null) {
      const interestedStatus = await this.prisma.candidateStatus.findFirst({
        where: {
          statusName: {
            equals: CANDIDATE_STATUS.INTERESTED,
            mode: 'insensitive',
          },
        },
        select: { id: true, statusName: true },
      });
      if (interestedStatus) {
        defaultStatusId = interestedStatus.id;
      } else {
        this.logger.warn(
          'Interested candidate status not found; using default status id 1',
        );
      }
    }
    const defaultStatus = await this.prisma.candidateStatus.findUnique({
      where: { id: defaultStatusId },
      select: { statusName: true },
    });

    const user = creatingUser;

    const candidateInclude = {
      team: true,
      workExperiences: candidateWorkExperiencesInclude,
      qualifications: candidateQualificationsInclude,
      professionType: {
        select: {
          id: true,
          name: true,
          label: true,
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
      religion: {
        select: { id: true, name: true },
      },
    } as const;

    const candidate = await this.prisma.$transaction(async (tx) => {
      const candidateCode = await this.candidateCodeService.reserveNextCode(tx);

      const created = await tx.candidate.create({
        data: {
          candidateCode,
          firstName: createCandidateDto.firstName,
          lastName: createCandidateDto.lastName,
          countryCode: hasPhone ? countryCode! : null,
          mobileNumber: hasPhone ? mobileNumber! : null,
          passportNumber: resolvedPassportNumber ?? null,
          email: createCandidateDto.email,
          profileImage: createCandidateDto.profileImage,
          addressCountryCode: createCandidateDto.addressCountryCode,
          addressStateId: createCandidateDto.addressStateId,
          address: createCandidateDto.address?.trim() || null,
          addressPincode: createCandidateDto.addressPincode?.trim() || null,
          alternatePhone: createCandidateDto.alternatePhone?.trim() || null,
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
          professionTypeId: createCandidateDto.professionTypeId,
          height: createCandidateDto.height,
          weight: createCandidateDto.weight,
          skinTone: createCandidateDto.skinTone,
          languageProficiency: createCandidateDto.languageProficiency,
          smartness: createCandidateDto.smartness,
          religionId: createCandidateDto.religionId?.trim() || null,
          licensingExam: createCandidateDto.licensingExam,
          dataFlow: createCandidateDto.dataFlow ?? null,
          eligibility: createCandidateDto.eligibility ?? null,
          eligibilityNumber:
            createCandidateDto.eligibility === true
              ? createCandidateDto.eligibilityNumber?.trim() || null
              : null,
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
          rolePreferences: createCandidateDto.preferredRoles
            ? {
                create: createCandidateDto.preferredRoles.map((roleCatalogId) => ({
                  roleCatalog: { connect: { id: roleCatalogId } },
                })),
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
      teamId,
      assignedTo,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      roles = [],
    } = query;

    // Build where clause
    const where: Prisma.CandidateWhereInput = {};

    // 1. Leadership / Agent Coordinator: may see candidates with source === 'agent'
    if (!canSeeAgentSourcedCandidates(roles)) {
      where.NOT = {
        source: 'agent',
      };
    }

    this.candidateListFilterService.applySearchFilter(where, search, {
      includeQualifications: true,
    });
    await this.candidateListFilterService.applyCrmStatusNameFilter(
      where,
      status,
      currentStatus,
    );
    this.candidateListFilterService.applyCreatedAtFilter(where, query);
    this.candidateListFilterService.applyAdvancedListFilters(where, query);

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

    this.candidateListFilterService.applyCreatedAtFilter(baseWhere, query);

    // Get all candidate status records in one query
    const statuses = await this.prisma.candidateStatus.findMany({
      where: {
        statusName: {
          in: [
            'untouched', 'rnr', 'call back', 'on_hold', 'interested', 'not_interested',
            'not_eligible', 'other_enquiry', 'qualified', 'future', CANDIDATE_STATUS.DEPLOYED
          ],
          mode: 'insensitive'
        }
      }
    });

    const getStatusId = (name: string) => {
      const normalizedTarget = name.replace(/_/g, ' ').toLowerCase();
      return statuses.find(
        (s) =>
          s.statusName.replace(/_/g, ' ').toLowerCase() === normalizedTarget,
      )?.id;
    };
    
    const untouchedId = getStatusId('untouched');
    const rnrId = getStatusId('rnr');
    const callBackId = getStatusId('call back');
    const onHoldId = getStatusId('on_hold');
    const interestedId = getStatusId('interested');
    const notInterestedId = getStatusId('not_interested');
    const notEligibleId = getStatusId('not_eligible');
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
      callBack: getCountForStatus(callBackId),
      rnrHandledByCRE: rnrCreCount,
      onHold: getCountForStatus(onHoldId),
      interested: getCountForStatus(interestedId),
      notInterested: getCountForStatus(notInterestedId),
      notEligible: getCountForStatus(notEligibleId),
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
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            isActive: true,
            recruiterId: true,
            createdAt: true,
            assignmentType: true,
            creStatusNote: true,
            operationsFollowUpStage: true,
            operationsCallAttempts: true,
            operationsLastCallAt: true,
            operationsStageEnteredAt: true,
            creStatus: {
              select: { id: true, statusName: true },
            },
            recruiter: {
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
            assignedByUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        statusHistories: {
          orderBy: { statusUpdatedAt: 'desc' },
          take: 15,
          select: {
            statusId: true,
            statusNameSnapshot: true,
            reason: true,
            statusUpdatedAt: true,
            status: { select: { id: true, statusName: true } },
          },
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
      const activeAssignment = candidate.recruiterAssignments?.find(
        (a: any) => a.isActive,
      );

      const firstAssignment = candidate.recruiterAssignments?.[0];
      const creReassignedAssignment = candidate.recruiterAssignments.find(
        (a: any) =>
          a.assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_REASSIGNED,
      );
      
      // Find the specific CRE assignment if it exists
      const creAssignment = candidate.recruiterAssignments.find(
        (a: any) => a.assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_AUTO || a.assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_MANUAL
      );

      // Check if candidate is handled by a CRE
      const isHandledByCRE = !!creAssignment;

      const isCREReassigned = !!creReassignedAssignment;
      const statusHistories = candidate.statusHistories ?? [];

      const { documents, statusHistories: _omitHistories, ...rest } = candidate;
      const merged = withProfileCompletion({
        ...rest,
        documents: documents ?? [],
      });
      return {
        ...merged,
        isHandledByCRE,
        isCREReassigned,
        creStatusNote: isCREReassigned
          ? resolveCreHandoffNote(creReassignedAssignment, statusHistories)
          : null,
        creStatus: isCREReassigned
          ? resolveCreHandoffStatus(creReassignedAssignment, statusHistories)
          : null,
        creHandler: creAssignment ? {
          id: creAssignment.recruiter.id,
          name: creAssignment.recruiter.name,
          email: creAssignment.recruiter.email,
        } : null,
        recruiter: activeAssignment?.recruiter || null,
        createdBy:
          firstAssignment?.createdByUser ||
          firstAssignment?.assignedByUser ||
          activeAssignment?.createdByUser ||
          activeAssignment?.assignedByUser ||
          null,
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
          professionType: {
            select: {
              id: true,
              name: true,
              label: true,
            },
          },
          rolePreferences: {
            include: {
              roleCatalog: {
                include: {
                  roleDepartment: true,
                },
              },
            },
          },
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
        careerGapAnalysis: calculateCareerGaps(
          candidate.workExperiences ?? [],
          candidate.qualifications ?? [],
        ),
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

  /** Merge CRE list base scope with shared advanced candidate filters. */
  private buildCreListWhere(
    baseWhere: Prisma.CandidateWhereInput,
    query: QueryCandidatesDto,
  ): Prisma.CandidateWhereInput {
    const advancedWhere: Prisma.CandidateWhereInput = {};
    this.candidateListFilterService.applySearchFilter(advancedWhere, query.search, {
      includeQualifications: true,
    });
    this.candidateListFilterService.applyCreatedAtFilter(advancedWhere, query);
    this.candidateListFilterService.applyAdvancedListFilters(advancedWhere, query);

    if (Object.keys(advancedWhere).length === 0) {
      return baseWhere;
    }

    return { AND: [baseWhere, advancedWhere] };
  }

  private getExcludedCreAssignmentTypes(): string[] {
    return [
      CANDIDATE_ASSIGNMENT_TYPE.CRE_CONVERTED,
      CANDIDATE_ASSIGNMENT_TYPE.CRE_REASSIGNED,
    ];
  }

  private async getCreAssignedUntouchedBucketCandidateIds(
    creUserId: string,
  ): Promise<string[]> {
    const waitMs = OPERATIONS_WEEK_ONE_WAIT_MS;
    const excludedTypes = this.getExcludedCreAssignmentTypes();
    const rows = await this.prisma.$queryRaw<{ candidateId: string }[]>`
      SELECT DISTINCT cra."candidateId" AS "candidateId"
      FROM "candidate_recruiter_assignments" cra
      WHERE cra."recruiterId" = ${creUserId}
        AND cra."isActive" = true
        AND cra."assignmentType" NOT IN (${Prisma.join(excludedTypes)})
        AND (
          cra."operationsFollowUpStage" = ${OPERATIONS_FOLLOW_UP_STAGE.INITIAL}
          OR (
            cra."operationsFollowUpStage" = ${OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE}
            AND COALESCE(cra."operationsCallAttempts", 0) = 0
            AND cra."operationsLastCallAt" IS NOT NULL
            AND cra."operationsStageEnteredAt" IS NOT NULL
            AND EXTRACT(EPOCH FROM (cra."operationsStageEnteredAt" - cra."operationsLastCallAt")) * 1000 < ${waitMs}
          )
        )
    `;
    return rows.map((row) => row.candidateId);
  }

  private async getCreWeekOneBucketCandidateIds(
    creUserId: string,
  ): Promise<string[]> {
    const waitMs = OPERATIONS_WEEK_ONE_WAIT_MS;
    const excludedTypes = this.getExcludedCreAssignmentTypes();
    const rows = await this.prisma.$queryRaw<{ candidateId: string }[]>`
      SELECT DISTINCT cra."candidateId" AS "candidateId"
      FROM "candidate_recruiter_assignments" cra
      WHERE cra."recruiterId" = ${creUserId}
        AND cra."isActive" = true
        AND cra."assignmentType" NOT IN (${Prisma.join(excludedTypes)})
        AND cra."operationsFollowUpStage" = ${OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE}
        AND (
          COALESCE(cra."operationsCallAttempts", 0) > 0
          OR (
            cra."operationsLastCallAt" IS NOT NULL
            AND cra."operationsStageEnteredAt" IS NOT NULL
            AND EXTRACT(EPOCH FROM (cra."operationsStageEnteredAt" - cra."operationsLastCallAt")) * 1000 >= ${waitMs}
          )
        )
    `;
    return rows.map((row) => row.candidateId);
  }

  /**
   * Get candidates assigned to a specific CRE user
   * Used for CRE dashboard to show only their assigned candidates
   */
  async getCREAssignedCandidates(
    creUserId: string,
    query: QueryCandidatesDto & { currentStatus?: string },
  ): Promise<{
    candidates: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page = 1, limit = 10, currentStatus, status } = query;
    const effectiveStatus = currentStatus || status;
    const skip = (page - 1) * limit;

    // Build where clause
    const baseWhere: Prisma.CandidateWhereInput = {
      recruiterAssignments: {
        some: {
          recruiterId: creUserId,
          isActive: true, // Only active assignments
        },
      },
    };

    let where: Prisma.CandidateWhereInput = baseWhere;

    // Add status filter (supports numeric id or statusName string)
    const normalizedStatusInput = effectiveStatus?.toLowerCase().trim();

    const statusNameMap: Record<string, string> = {
      interested: 'interested',
      rnr: 'rnr',
      call_back: 'call back',
      'call back': 'call back',
      'on_hold': 'on hold',
      'on hold': 'on hold',
      untouched: 'untouched',
      junk: 'junk',
      week_one: 'week_one',
      week_two: 'week_two',
    };

    const followUpStageFilters: Record<string, string> = {
      junk: OPERATIONS_FOLLOW_UP_STAGE.JUNK,
      week_one: OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE,
      week_two: OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO,
    };

    const buildActiveCreAssignmentWhere = (
      followUpStage?: string,
    ): Prisma.CandidateRecruiterAssignmentWhereInput => ({
      recruiterId: creUserId,
      isActive: true,
      assignmentType: {
        notIn: [
          CANDIDATE_ASSIGNMENT_TYPE.CRE_CONVERTED,
          CANDIDATE_ASSIGNMENT_TYPE.CRE_REASSIGNED,
        ],
      },
      ...(followUpStage ? { operationsFollowUpStage: followUpStage } : {}),
    });

    if (normalizedStatusInput) {
      if (normalizedStatusInput === 'interested') {
        // Converted Response mode: now identified by assignmentType instead of status
        where.recruiterAssignments = {
          some: {
            recruiterId: creUserId,
            isActive: true,
            assignmentType: CANDIDATE_ASSIGNMENT_TYPE.CRE_CONVERTED,
          },
        };
      } else if (normalizedStatusInput === 'junk') {
        where = {
          AND: [
            {
              recruiterAssignments: {
                some: {
                  recruiterId: creUserId,
                  isActive: true,
                  assignmentType: {
                    notIn: [
                      CANDIDATE_ASSIGNMENT_TYPE.CRE_CONVERTED,
                      CANDIDATE_ASSIGNMENT_TYPE.CRE_REASSIGNED,
                    ],
                  },
                },
              },
            },
            {
              OR: [
                { isJunk: true },
                {
                  recruiterAssignments: {
                    some: buildActiveCreAssignmentWhere(
                      OPERATIONS_FOLLOW_UP_STAGE.JUNK,
                    ),
                  },
                },
              ],
            },
          ],
        };
      } else if (normalizedStatusInput === 'week_one') {
        const weekOneCandidateIds =
          await this.getCreWeekOneBucketCandidateIds(creUserId);
        where.id = { in: weekOneCandidateIds };
      } else if (normalizedStatusInput === 'week_two') {
        where.recruiterAssignments = {
          some: buildActiveCreAssignmentWhere(
            followUpStageFilters.week_two,
          ),
        };
      } else if (followUpStageFilters[normalizedStatusInput]) {
        where.recruiterAssignments = {
          some: buildActiveCreAssignmentWhere(
            followUpStageFilters[normalizedStatusInput],
          ),
        };
      } else {
        const normalizedStatus = statusNameMap[normalizedStatusInput] ?? normalizedStatusInput;
        const statusId = Number(normalizedStatusInput);

        if (!Number.isNaN(statusId)) {
          where.currentStatusId = statusId;
          where.recruiterAssignments = {
            some: buildActiveCreAssignmentWhere(
              OPERATIONS_FOLLOW_UP_STAGE.INITIAL,
            ),
          };
        } else {
          where.currentStatus = { statusName: { equals: normalizedStatus, mode: 'insensitive' } };
          where.recruiterAssignments = {
            some: buildActiveCreAssignmentWhere(
              OPERATIONS_FOLLOW_UP_STAGE.INITIAL,
            ),
          };
        }
      }
    } else {
      const assignedCandidateIds =
        await this.getCreAssignedUntouchedBucketCandidateIds(creUserId);
      where.id = { in: assignedCandidateIds };
    }

    if (query.operationsCallAttempts !== undefined) {
      const callCountFilter =
        query.operationsCallAttempts >=
        OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE
          ? { gte: OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE }
          : query.operationsCallAttempts;
      const callCountAssignmentWhere: Prisma.CandidateRecruiterAssignmentWhereInput =
        {
          recruiterId: creUserId,
          isActive: true,
          assignmentType: {
            notIn: [
              CANDIDATE_ASSIGNMENT_TYPE.CRE_CONVERTED,
              CANDIDATE_ASSIGNMENT_TYPE.CRE_REASSIGNED,
            ],
          },
          operationsCallAttempts: callCountFilter,
        };

      if (where.id) {
        where = {
          AND: [
            { id: where.id },
            {
              recruiterAssignments: {
                some: callCountAssignmentWhere,
              },
            },
          ],
        };
      } else {
        const assignmentFilter = where.recruiterAssignments;
        if (
          assignmentFilter &&
          typeof assignmentFilter === 'object' &&
          'some' in assignmentFilter &&
          assignmentFilter.some
        ) {
          where.recruiterAssignments = {
            some: {
              ...(assignmentFilter.some as Prisma.CandidateRecruiterAssignmentWhereInput),
              operationsCallAttempts: callCountFilter,
            },
          };
        }
      }
    }

    where = this.buildCreListWhere(where, query);

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
        isJunk: true,
        currentStatus: {
          select: {
            statusName: true,
          },
        },
        recruiterAssignments: {
          select: {
            assignmentType: true,
            assignedAt: true,
            operationsFollowUpStage: true,
            operationsCallAttempts: true,
            operationsLastCallAt: true,
            operationsStageEnteredAt: true,
          },
          where: {
            recruiterId: creUserId,
            isActive: true,
          },
        },
      },
    });

    const roleCounters = {
      assigned: 0,
      converted: 0,
      reassigned: 0,
      rnr: 0,
      onHold: 0,
      untouched: 0,
      junk: 0,
      weekOne: 0,
      weekTwo: 0,
      other: 0,
    };

    allAssigned.forEach((candidate) => {
      const assignment = candidate.recruiterAssignments[0];
      const assignmentType = assignment?.assignmentType;
      const followUpStage =
        assignment?.operationsFollowUpStage ??
        OPERATIONS_FOLLOW_UP_STAGE.INITIAL;

      if (assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_CONVERTED ||
          assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_REASSIGNED) {
        if (assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_CONVERTED) {
          roleCounters.converted += 1;
        }
        return;
      }

      if (
        followUpStage === OPERATIONS_FOLLOW_UP_STAGE.JUNK ||
        candidate.isJunk
      ) {
        roleCounters.junk += 1;
        return;
      }

      if (followUpStage === OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO) {
        roleCounters.weekTwo += 1;
        return;
      }

      if (isEligibleForWeekOneDashboardBucket(assignment)) {
        roleCounters.weekOne += 1;
        return;
      }

      if (!isAssignedUntouchedDashboardBucket(assignment)) {
        roleCounters.other += 1;
        return;
      }

      const status = (candidate.currentStatus?.statusName || '').toLowerCase();
      if (status === 'rnr') {
        roleCounters.rnr += 1;
      } else if (status === 'on hold' || status === 'on_hold') {
        roleCounters.onHold += 1;
      } else if (status === 'untouched') {
        roleCounters.untouched += 1;
      } else if (status === 'interested') {
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

    // Count reassigned candidates (CRE transferred to recruiter at any handoff status)
    roleCounters.reassigned = await this.prisma.candidate.count({
      where: this.buildCreReassignedCandidatesWhere(creUserId),
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
      throw new ForbiddenException('Operations may only convert assigned candidates.');
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
        isJunk: false,
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
      message: `Candidate ${updatedCandidate.firstName} ${updatedCandidate.lastName} marked as converted response by Operations`,
    });

    return updatedCandidate as any;
  }

  private async getActiveOperationsAssignmentForUser(
    candidateId: string,
    operationsUserId: string,
  ) {
    const assignment = await this.prisma.candidateRecruiterAssignment.findFirst({
      where: {
        candidateId,
        recruiterId: operationsUserId,
        isActive: true,
        assignmentType: {
          in: [
            CANDIDATE_ASSIGNMENT_TYPE.CRE_AUTO,
            CANDIDATE_ASSIGNMENT_TYPE.CRE_MANUAL,
          ],
        },
      },
    });

    if (!assignment) {
      throw new ForbiddenException(
        'Operations may only update follow-up for candidates assigned to them.',
      );
    }

    return assignment;
  }

  private assertOperationsStageWaitElapsed(
    stageEnteredAt: Date | null,
    requiredWaitMs: number,
    stageLabel: string,
  ): void {
    if (!stageEnteredAt) {
      throw new BadRequestException(
        `${stageLabel} stage entry time is missing.`,
      );
    }

    const remainingMs = getOperationsStageWaitRemainingMs(
      stageEnteredAt,
      requiredWaitMs,
    );

    if (remainingMs > 0) {
      const remainingSec = Math.ceil(remainingMs / 1000);
      throw new BadRequestException(
        `Must wait before advancing from ${stageLabel}. ${remainingSec} second(s) remaining.`,
      );
    }
  }

  private async advanceToWeekOneTx(
    tx: Prisma.TransactionClient,
    assignmentId: string,
    now = new Date(),
  ) {
    return tx.candidateRecruiterAssignment.update({
      where: { id: assignmentId },
      data: {
        operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE,
        operationsCallAttempts: 0,
        operationsStageEnteredAt: now,
      },
    });
  }

  private async advanceToWeekTwoTx(
    tx: Prisma.TransactionClient,
    assignmentId: string,
    now = new Date(),
  ) {
    return tx.candidateRecruiterAssignment.update({
      where: { id: assignmentId },
      data: {
        operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO,
        operationsStageEnteredAt: now,
      },
    });
  }

  private async markAsJunkTx(
    tx: Prisma.TransactionClient,
    assignmentId: string,
    candidateId: string,
    now = new Date(),
  ) {
    const updatedAssignment = await tx.candidateRecruiterAssignment.update({
      where: { id: assignmentId },
      data: {
        operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.JUNK,
        operationsStageEnteredAt: now,
      },
    });

    await tx.candidate.update({
      where: { id: candidateId },
      data: { isJunk: true, updatedAt: now },
    });

    return updatedAssignment;
  }

  async logOperationsCall(
    candidateId: string,
    operationsUserId: string,
    dto: LogOperationsCallDto,
  ) {
    const assignment = await this.getActiveOperationsAssignmentForUser(
      candidateId,
      operationsUserId,
    );

    const stage =
      assignment.operationsFollowUpStage ?? OPERATIONS_FOLLOW_UP_STAGE.INITIAL;

    if (stage === OPERATIONS_FOLLOW_UP_STAGE.JUNK) {
      throw new BadRequestException(
        'Call logging is not available for junk candidates.',
      );
    }

    if (!dto.usedPhone && !dto.usedWhatsapp) {
      throw new BadRequestException(
        'Select at least one contact method: Phone or WhatsApp.',
      );
    }

    const note = dto.note.trim();
    const now = new Date();

    if (stage === OPERATIONS_FOLLOW_UP_STAGE.INITIAL) {
      if (
        assignment.operationsCallAttempts >=
        OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE
      ) {
        throw new BadRequestException(
          `Maximum of ${OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE} call attempts already logged.`,
        );
      }

      const nextAttempt = assignment.operationsCallAttempts + 1;
      const autoAdvanceToWeekOne =
        nextAttempt >= OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE;

      return this.prisma.$transaction(async (tx) => {
        const callLog = await tx.operationsCallLog.create({
          data: {
            candidateId,
            assignmentId: assignment.id,
            loggedById: operationsUserId,
            attemptNumber: nextAttempt,
            note,
            usedPhone: dto.usedPhone,
            usedWhatsapp: dto.usedWhatsapp,
            followUpStage: OPERATIONS_FOLLOW_UP_STAGE.INITIAL,
            callOutcome: OPERATIONS_CALL_OUTCOME.NO_RESPONDED,
          },
          include: {
            loggedBy: {
              select: { id: true, name: true },
            },
          },
        });

        let updatedAssignment = await tx.candidateRecruiterAssignment.update({
          where: { id: assignment.id },
          data: {
            operationsCallAttempts: nextAttempt,
            operationsLastCallAt: now,
          },
        });

        if (autoAdvanceToWeekOne) {
          updatedAssignment = await tx.candidateRecruiterAssignment.update({
            where: { id: assignment.id },
            data: {
              operationsStageEnteredAt: now,
            },
          });
        }

        await tx.candidate.update({
          where: { id: candidateId },
          data: { updatedAt: now },
        });

        return {
          assignment: updatedAssignment,
          callLog,
          startedWeekOneWait: autoAdvanceToWeekOne,
        };
      });
    }

    if (stage === OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE) {
      const nextAttempt = assignment.operationsCallAttempts + 1;

      return this.prisma.$transaction(async (tx) => {
        const callLog = await tx.operationsCallLog.create({
          data: {
            candidateId,
            assignmentId: assignment.id,
            loggedById: operationsUserId,
            attemptNumber: nextAttempt,
            note,
            usedPhone: dto.usedPhone,
            usedWhatsapp: dto.usedWhatsapp,
            followUpStage: OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE,
            callOutcome: OPERATIONS_CALL_OUTCOME.NO_RESPONDED,
          },
          include: {
            loggedBy: {
              select: { id: true, name: true },
            },
          },
        });

        const updatedAssignment = await tx.candidateRecruiterAssignment.update({
          where: { id: assignment.id },
          data: {
            operationsCallAttempts: nextAttempt,
            operationsLastCallAt: now,
          },
        });

        await tx.candidate.update({
          where: { id: candidateId },
          data: { updatedAt: now },
        });

        return { assignment: updatedAssignment, callLog };
      });
    }

    if (stage === OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO) {
      const nextAttempt = assignment.operationsCallAttempts + 1;

      return this.prisma.$transaction(async (tx) => {
        const callLog = await tx.operationsCallLog.create({
          data: {
            candidateId,
            assignmentId: assignment.id,
            loggedById: operationsUserId,
            attemptNumber: nextAttempt,
            note,
            usedPhone: dto.usedPhone,
            usedWhatsapp: dto.usedWhatsapp,
            followUpStage: OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO,
            callOutcome: OPERATIONS_CALL_OUTCOME.NO_RESPONDED,
          },
          include: {
            loggedBy: {
              select: { id: true, name: true },
            },
          },
        });

        await tx.candidateRecruiterAssignment.update({
          where: { id: assignment.id },
          data: {
            operationsCallAttempts: nextAttempt,
            operationsLastCallAt: now,
          },
        });

        const updatedAssignment = await this.markAsJunkTx(
          tx,
          assignment.id,
          candidateId,
          now,
        );

        return {
          assignment: updatedAssignment,
          callLog,
          markedJunk: true,
        };
      });
    }

    throw new BadRequestException(
      'Call logging is not available for this follow-up stage.',
    );
  }

  async sweepOperationsFollowUp(now = new Date()): Promise<{
    initialAdvancedToWeekOne: number;
    weekOneAdvanced: number;
    weekTwoJunked: number;
  }> {
    const weekOneCutoff = new Date(
      now.getTime() - OPERATIONS_WEEK_ONE_WAIT_MS,
    );
    const weekTwoCutoff = new Date(
      now.getTime() - OPERATIONS_WEEK_TWO_WAIT_MS,
    );

    const operationsAssignmentTypes = [
      CANDIDATE_ASSIGNMENT_TYPE.CRE_AUTO,
      CANDIDATE_ASSIGNMENT_TYPE.CRE_MANUAL,
    ];

    const initialWeekOneDue =
      await this.prisma.candidateRecruiterAssignment.findMany({
        where: {
          isActive: true,
          assignmentType: { in: operationsAssignmentTypes },
          operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.INITIAL,
          operationsCallAttempts: {
            gte: OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE,
          },
          operationsStageEnteredAt: { lte: weekOneCutoff },
        },
        select: { id: true, candidateId: true },
      });

    let initialAdvancedToWeekOne = 0;
    for (const assignment of initialWeekOneDue) {
      await this.prisma.$transaction(async (tx) => {
        await this.advanceToWeekOneTx(tx, assignment.id, now);
        await tx.candidate.update({
          where: { id: assignment.candidateId },
          data: { updatedAt: now },
        });
      });
      initialAdvancedToWeekOne += 1;
    }

    const weekOneDue = await this.prisma.candidateRecruiterAssignment.findMany({
      where: {
        isActive: true,
        assignmentType: { in: operationsAssignmentTypes },
        operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE,
        operationsStageEnteredAt: { lte: weekOneCutoff },
      },
      select: { id: true, candidateId: true },
    });

    let weekOneAdvanced = 0;
    for (const assignment of weekOneDue) {
      await this.prisma.$transaction(async (tx) => {
        await this.advanceToWeekTwoTx(tx, assignment.id, now);
        await tx.candidate.update({
          where: { id: assignment.candidateId },
          data: { updatedAt: now },
        });
      });
      weekOneAdvanced += 1;
    }

    const weekTwoDue = await this.prisma.candidateRecruiterAssignment.findMany({
      where: {
        isActive: true,
        assignmentType: { in: operationsAssignmentTypes },
        operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO,
        operationsStageEnteredAt: { lte: weekTwoCutoff },
      },
      select: { id: true, candidateId: true },
    });

    let weekTwoJunked = 0;
    for (const assignment of weekTwoDue) {
      await this.prisma.$transaction(async (tx) => {
        await this.markAsJunkTx(tx, assignment.id, assignment.candidateId, now);
      });
      weekTwoJunked += 1;
    }

    if (
      initialAdvancedToWeekOne > 0 ||
      weekOneAdvanced > 0 ||
      weekTwoJunked > 0
    ) {
      this.logger.log(
        `Operations follow-up sweep: ${initialAdvancedToWeekOne} advanced to week_one, ${weekOneAdvanced} advanced to week_two, ${weekTwoJunked} marked junk`,
      );
    }

    return { initialAdvancedToWeekOne, weekOneAdvanced, weekTwoJunked };
  }

  async getOperationsCallHistory(
    candidateId: string,
    userId: string,
    userPermissions: string[] = [],
    userRoles: string[] = [],
  ) {
    const elevatedViewerRoles = [
      'CEO',
      'Director',
      'Manager',
      'Recruiter Manager',
      'Team Head',
      'Team Lead',
      'System Admin',
      ROLE_NAMES.OPERATIONS,
      'CRE',
    ];

    const canViewAnyOperationsCallHistory =
      userPermissions.includes('*') ||
      userPermissions.includes('read:all') ||
      userPermissions.includes('manage:all') ||
      userPermissions.includes(PERMISSIONS.READ_OPERATIONS_CALL_HISTORY) ||
      userRoles.some((role) => elevatedViewerRoles.includes(role));

    const operationsAssignmentTypes = [
      CANDIDATE_ASSIGNMENT_TYPE.CRE_AUTO,
      CANDIDATE_ASSIGNMENT_TYPE.CRE_MANUAL,
    ];

    let assignment = await this.prisma.candidateRecruiterAssignment.findFirst({
      where: {
        candidateId,
        assignmentType: { in: operationsAssignmentTypes },
        isActive: true,
      },
      orderBy: { assignedAt: 'desc' },
    });

    if (!assignment) {
      assignment = await this.prisma.candidateRecruiterAssignment.findFirst({
        where: {
          candidateId,
          assignmentType: { in: operationsAssignmentTypes },
        },
        orderBy: { assignedAt: 'desc' },
      });
    }

    if (!assignment) {
      throw new ForbiddenException(
        'No Operations assignment found for this candidate.',
      );
    }

    const isAssignedOperationsHandler = assignment.recruiterId === userId;

    let canView =
      canViewAnyOperationsCallHistory || isAssignedOperationsHandler;

    if (!canView) {
      const recruiterAssignment =
        await this.prisma.candidateRecruiterAssignment.findFirst({
          where: {
            candidateId,
            recruiterId: userId,
            isActive: true,
            assignmentType: { notIn: operationsAssignmentTypes },
          },
        });
      canView = Boolean(recruiterAssignment);
    }

    if (!canView) {
      throw new ForbiddenException(
        'You do not have permission to view Operations call history for this candidate.',
      );
    }

    return this.prisma.operationsCallLog.findMany({
      where: {
        candidateId,
        assignmentId: assignment.id,
      },
      orderBy: { loggedAt: 'desc' },
      include: {
        loggedBy: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async moveOperationsToWeekOne(
    candidateId: string,
    operationsUserId: string,
  ) {
    const assignment = await this.getActiveOperationsAssignmentForUser(
      candidateId,
      operationsUserId,
    );

    if (assignment.operationsFollowUpStage !== OPERATIONS_FOLLOW_UP_STAGE.INITIAL) {
      throw new BadRequestException(
        'Candidate must be in the initial follow-up stage to move to 1 Week.',
      );
    }

    if (
      assignment.operationsCallAttempts <
      OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE
    ) {
      throw new BadRequestException(
        `At least ${OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE} logged calls are required before moving to 1 Week.`,
      );
    }

    const now = new Date();
    const updatedAssignment = await this.prisma.$transaction(async (tx) => {
      const result = await this.advanceToWeekOneTx(tx, assignment.id, now);
      await tx.candidate.update({
        where: { id: candidateId },
        data: { updatedAt: now },
      });
      return result;
    });

    return { assignment: updatedAssignment };
  }

  async moveOperationsToWeekTwo(
    candidateId: string,
    operationsUserId: string,
  ) {
    const assignment = await this.getActiveOperationsAssignmentForUser(
      candidateId,
      operationsUserId,
    );

    if (assignment.operationsFollowUpStage !== OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE) {
      throw new BadRequestException(
        'Candidate must be in the 1 Week follow-up stage to move to 2nd Week.',
      );
    }

    this.assertOperationsStageWaitElapsed(
      assignment.operationsStageEnteredAt,
      OPERATIONS_WEEK_ONE_WAIT_MS,
      '1 Week follow-up',
    );

    const now = new Date();
    const updatedAssignment = await this.prisma.$transaction(async (tx) => {
      const result = await this.advanceToWeekTwoTx(tx, assignment.id, now);
      await tx.candidate.update({
        where: { id: candidateId },
        data: { updatedAt: now },
      });
      return result;
    });

    return { assignment: updatedAssignment };
  }

  async markOperationsNotInterested(
    candidateId: string,
    operationsUserId: string,
    dto: LogOperationsCallDto,
  ) {
    const assignment = await this.getActiveOperationsAssignmentForUser(
      candidateId,
      operationsUserId,
    );

    const stage =
      assignment.operationsFollowUpStage ?? OPERATIONS_FOLLOW_UP_STAGE.INITIAL;

    if (!dto.usedPhone && !dto.usedWhatsapp) {
      throw new BadRequestException(
        'Select at least one contact method: Phone or WhatsApp.',
      );
    }

    const note = dto.note.trim();
    const now = new Date();
    const nextAttempt = assignment.operationsCallAttempts + 1;

    if (stage === OPERATIONS_FOLLOW_UP_STAGE.JUNK) {
      return this.prisma.$transaction(async (tx) => {
        const callLog = await tx.operationsCallLog.create({
          data: {
            candidateId,
            assignmentId: assignment.id,
            loggedById: operationsUserId,
            attemptNumber: nextAttempt,
            note,
            usedPhone: dto.usedPhone,
            usedWhatsapp: dto.usedWhatsapp,
            followUpStage: OPERATIONS_FOLLOW_UP_STAGE.JUNK,
            callOutcome: OPERATIONS_CALL_OUTCOME.NOT_INTERESTED,
          },
          include: {
            loggedBy: {
              select: { id: true, name: true },
            },
          },
        });

        const updatedAssignment = await tx.candidateRecruiterAssignment.update({
          where: { id: assignment.id },
          data: {
            operationsCallAttempts: nextAttempt,
            operationsLastCallAt: now,
          },
        });

        await tx.candidate.update({
          where: { id: candidateId },
          data: { updatedAt: now },
        });

        return {
          assignment: updatedAssignment,
          callLog,
          alreadyJunk: true,
        };
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const callLog = await tx.operationsCallLog.create({
        data: {
          candidateId,
          assignmentId: assignment.id,
          loggedById: operationsUserId,
          attemptNumber: nextAttempt,
          note,
          usedPhone: dto.usedPhone,
          usedWhatsapp: dto.usedWhatsapp,
          followUpStage: stage,
          callOutcome: OPERATIONS_CALL_OUTCOME.NOT_INTERESTED,
        },
        include: {
          loggedBy: {
            select: { id: true, name: true },
          },
        },
      });

      await tx.candidateRecruiterAssignment.update({
        where: { id: assignment.id },
        data: {
          operationsCallAttempts: nextAttempt,
          operationsLastCallAt: now,
        },
      });

      const updatedAssignment = await this.markAsJunkTx(
        tx,
        assignment.id,
        candidateId,
        now,
      );

      return {
        assignment: updatedAssignment,
        callLog,
        markedJunk: true,
      };
    });
  }

  private async recordInterestedOperationsCall(
    assignment: {
      id: string;
      operationsCallAttempts: number;
      operationsFollowUpStage: string | null;
    },
    candidateId: string,
    creUserId: string,
    dto: Pick<
      TransferToRecruiterDto,
      'operationsCallNote' | 'usedPhone' | 'usedWhatsapp'
    >,
  ) {
    const note = dto.operationsCallNote?.trim();
    if (!note) {
      return;
    }

    if (!dto.usedPhone && !dto.usedWhatsapp) {
      throw new BadRequestException(
        'Select at least one contact method: Phone or WhatsApp.',
      );
    }

    const now = new Date();
    const stage =
      assignment.operationsFollowUpStage ?? OPERATIONS_FOLLOW_UP_STAGE.INITIAL;
    const nextAttempt = assignment.operationsCallAttempts + 1;

    await this.prisma.operationsCallLog.create({
      data: {
        candidateId,
        assignmentId: assignment.id,
        loggedById: creUserId,
        attemptNumber: nextAttempt,
        note,
        usedPhone: dto.usedPhone ?? false,
        usedWhatsapp: dto.usedWhatsapp ?? false,
        followUpStage: stage,
        callOutcome: OPERATIONS_CALL_OUTCOME.INTERESTED,
      },
    });

    await this.prisma.candidateRecruiterAssignment.update({
      where: { id: assignment.id },
      data: {
        operationsCallAttempts: nextAttempt,
        operationsLastCallAt: now,
      },
    });
  }

  async markOperationsJunk(
    candidateId: string,
    operationsUserId: string,
  ) {
    const assignment = await this.getActiveOperationsAssignmentForUser(
      candidateId,
      operationsUserId,
    );

    if (assignment.operationsFollowUpStage !== OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO) {
      throw new BadRequestException(
        'Candidate must be in the 2 Week follow-up stage to mark as junk.',
      );
    }

    this.assertOperationsStageWaitElapsed(
      assignment.operationsStageEnteredAt,
      OPERATIONS_WEEK_TWO_WAIT_MS,
      '2 Week follow-up',
    );

    const now = new Date();
    const updatedAssignment = await this.prisma.$transaction(async (tx) =>
      this.markAsJunkTx(tx, assignment.id, candidateId, now),
    );

    return { assignment: updatedAssignment };
  }

  private validateCandidateStatusTransitionFields(
    statusName: string,
    fields: Pick<
      UpdateCandidateStatusDto,
      'onHoldDurationDays' | 'onHoldUntil' | 'futureDate'
    >,
  ): void {
    const normalizedStatus = statusName.toLowerCase();

    if (normalizedStatus === 'on hold' || normalizedStatus === 'onhold') {
      if (
        (fields.onHoldDurationDays === undefined ||
          fields.onHoldDurationDays === null ||
          fields.onHoldDurationDays <= 0) &&
        !fields.onHoldUntil
      ) {
        throw new BadRequestException(
          'onHoldDurationDays or onHoldUntil is required when status is On Hold',
        );
      }
    }

    if (normalizedStatus === 'future') {
      if (!fields.futureDate) {
        throw new BadRequestException(
          'futureDate is required when status is Future',
        );
      }
      const futureDate = new Date(fields.futureDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (futureDate < today) {
        throw new BadRequestException(
          'futureDate must be today or a future date when status is Future',
        );
      }
    }
  }

  private async resolveTransferToRecruiterStatus(
    dto: TransferToRecruiterDto,
  ): Promise<{ id: number; statusName: string }> {
    const status = await this.prisma.candidateStatus.findUnique({
      where: { id: dto.currentStatusId },
    });

    if (!status) {
      throw new NotFoundException(
        `Candidate status ${dto.currentStatusId} not found`,
      );
    }

    const normalizedStatus = status.statusName.toLowerCase();
    const disallowedForCreTransfer = new Set([
      'qualified',
      'new',
      'nominated',
      'verified',
      'interviewing',
      'selected',
      'processing',
      'hired',
      'rejected',
      'deployed',
    ]);

    if (disallowedForCreTransfer.has(normalizedStatus)) {
      throw new BadRequestException(
        `Status "${status.statusName}" cannot be set during Operations reassignment`,
      );
    }

    this.validateCandidateStatusTransitionFields(status.statusName, dto);

    return status;
  }

  async transferCREConvertedToRecruiter(
    candidateId: string,
    creUserId: string,
    dto: TransferToRecruiterDto,
  ) {
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
        'Operations can only transfer candidates assigned to them',
      );
    }

    await this.recordInterestedOperationsCall(
      activeCREAssignment,
      candidateId,
      creUserId,
      dto,
    );

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

    const creStatus = await this.resolveTransferToRecruiterStatus(dto);

    const statusNote = dto.reason?.trim();
    if (!statusNote) {
      throw new BadRequestException('Operations status note is required');
    }

    const untouchedStatus = await this.prisma.candidateStatus.findFirst({
      where: {
        statusName: { equals: CANDIDATE_STATUS.UNTOUCHED, mode: 'insensitive' },
      },
    });

    if (!untouchedStatus) {
      throw new NotFoundException('Untouched status not found');
    }

    let creStatusOnHoldDays: number | null = null;
    const creStatusNormalized = creStatus.statusName.toLowerCase();
    if (creStatusNormalized === 'on hold' || creStatusNormalized === 'onhold') {
      if (dto.onHoldUntil) {
        const untilDate = new Date(dto.onHoldUntil);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        creStatusOnHoldDays = Math.ceil(
          (untilDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
      } else {
        creStatusOnHoldDays = dto.onHoldDurationDays ?? null;
      }
    }

    const reassignmentReason = 'Handed back from Operations converted response';

    // Update the primary recruiter assignment to mark it as cre_reassigned
    if (primaryAssignment) {
      await this.prisma.candidateRecruiterAssignment.update({
        where: { id: primaryAssignment.id },
        data: {
          assignmentType: CANDIDATE_ASSIGNMENT_TYPE.CRE_REASSIGNED,
          assignedBy: creUserId,
          reason: reassignmentReason,
          creStatusNote: statusNote,
          creStatusId: creStatus.id,
        },
      });
    }

    await this.outboxService.publishCandidateRecruiterAssigned(
      candidateId,
      primaryAssignment?.recruiterId || creUserId, // Notify the primary recruiter (or self if none)
      creUserId,
      reassignmentReason,
      creUserId, // Previous was the CRE
    );

    // Recruiter always receives the candidate as untouched to call fresh
    const updatedCandidate = await this.prisma.candidate.update({
      where: { id: candidateId },
      data: {
        currentStatusId: untouchedStatus.id,
        isJunk: false,
        onHoldDuration: null,
        onHoldUntil: null,
        futureDate: null,
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
            creStatus: {
              select: { id: true, statusName: true },
            },
          },
        },
        currentStatus: true,
      },
    });

    const creUserName =
      (await this.prisma.user.findUnique({ where: { id: creUserId } }))?.name ||
      ROLE_NAMES.OPERATIONS;

    await this.prisma.candidateStatusHistory.create({
      data: {
        candidateId,
        changedById: creUserId,
        changedByName: creUserName,
        statusId: creStatus.id,
        statusNameSnapshot: creStatus.statusName,
        statusUpdatedAt: new Date(),
        notificationCount: 0,
        reason: statusNote,
        onHoldDurationDays: creStatusOnHoldDays,
      },
    });

    await this.prisma.candidateStatusHistory.create({
      data: {
        candidateId,
        changedById: creUserId,
        changedByName: creUserName,
        statusId: untouchedStatus.id,
        statusNameSnapshot: untouchedStatus.statusName,
        statusUpdatedAt: new Date(),
        notificationCount: 0,
        reason: CRE_REASSIGN_RECRUITER_RETURN_REASON,
      },
    });

    await this.outboxService.publishEvent('DataSync', {
      type: 'Candidate',
      candidateId,
      message: `Candidate ${updatedCandidate.firstName} ${updatedCandidate.lastName} transferred from Operations to recruiter ${primaryAssignment?.recruiter?.name || 'Primary Recruiter'}`,
    });

    // Notify the target recruiter that a CRE has transferred a candidate to them
    if (primaryAssignment) {
      await this.outboxService.publishRecruiterNotification(
        primaryAssignment.recruiterId,
        `Candidate ${updatedCandidate.firstName} ${updatedCandidate.lastName} has been transferred back to you by Operations ${(await this.prisma.user.findUnique({ where: { id: creUserId } }))?.name || 'a team member'} after being converted from RNR.`,
        'Candidate Transferred from Operations',
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

  /**
   * Candidates handed from CRE to recruiter (any status CRE set on reassign).
   */
  private buildCreReassignedCandidatesWhere(
    creUserId: string,
    search?: string,
  ): Prisma.CandidateWhereInput {
    const reassignedFilter: Prisma.CandidateWhereInput = {
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
    };

    if (!search?.trim()) {
      return reassignedFilter;
    }

    const term = search.trim();
    return {
      AND: [
        reassignedFilter,
        {
          OR: [
            { firstName: { contains: term, mode: 'insensitive' } },
            { lastName: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
            { mobileNumber: { contains: term, mode: 'insensitive' } },
          ],
        },
      ],
    };
  }

  async getCREReassignedCandidates(
    recruiterId: string,
    query: QueryCandidatesDto,
  ) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const baseWhere: Prisma.CandidateWhereInput = {
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

    const where = this.buildCreListWhere(baseWhere, query);

    const total = await this.prisma.candidate.count({ where });

    const candidates = await this.prisma.candidate.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        currentStatus: { select: { id: true, statusName: true } },
        statusHistories: {
          orderBy: { statusUpdatedAt: 'desc' },
          take: 15,
          include: {
            status: { select: { id: true, statusName: true } },
          },
        },
        recruiterAssignments: {
          where: { isActive: true },
          include: {
            recruiter: { select: { id: true, name: true, email: true } },
            assignedByUser: { select: { id: true, name: true, email: true } },
            creStatus: { select: { id: true, statusName: true } },
          },
        },
      },
    });

    const candidatesWithCreStatus = candidates.map((candidate) => {
      const reassignedAssignment = candidate.recruiterAssignments.find(
        (assignment) =>
          assignment.assignmentType ===
          CANDIDATE_ASSIGNMENT_TYPE.CRE_REASSIGNED,
      );

      const creStatus = resolveCreHandoffStatus(
        reassignedAssignment,
        candidate.statusHistories,
      );

      const { statusHistories: _omit, ...candidateRest } = candidate;

      return {
        ...candidateRest,
        creStatus,
      };
    });

    return {
      candidates: candidatesWithCreStatus,
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
    query: QueryCandidatesDto,
  ) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const baseWhere: Prisma.CandidateWhereInput = {
      recruiterAssignments: {
        some: {
          createdBy: creUserId,
        },
      },
    };

    const where = this.buildCreListWhere(baseWhere, query);

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
        professionType: {
          select: {
            id: true,
            name: true,
            label: true,
          },
        },
        rolePreferences: {
          include: {
            roleCatalog: {
              include: {
                roleDepartment: true,
              },
            },
          },
        },
        addressCountry: {
          select: { code: true, name: true },
        },
        addressState: {
          select: { id: true, name: true, code: true },
        },
        religion: {
          select: { id: true, name: true },
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
            creStatus: {
              select: { id: true, statusName: true },
            },
          },
          orderBy: { assignedAt: 'asc' },
        },
        documents: {
          where: { isDeleted: false },
          select: {
            id: true,
            docType: true,
            fileName: true,
            fileUrl: true,
            documentNumber: true,
            issuedAt: true,
            expiryDate: true,
            createdAt: true,
          },
        },
        statusHistories: {
          orderBy: { statusUpdatedAt: 'desc' },
          take: 15,
          select: {
            statusId: true,
            statusNameSnapshot: true,
            reason: true,
            statusUpdatedAt: true,
            status: { select: { id: true, statusName: true } },
          },
        },
      },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }

    const { statusHistories, documents, ...candidateWithoutHistories } =
      candidate;

    // Extract the creator from the first active assignment
    const firstAssignment = candidateWithoutHistories.recruiterAssignments?.[0];
    const activeAssignment = candidateWithoutHistories.recruiterAssignments?.find(
      (assignment) => assignment.isActive,
    );
    const createdBy =
      firstAssignment?.createdByUser ||
      firstAssignment?.assignedByUser ||
      null;

    const base = withProfileCompletion(candidateWithoutHistories as any);

    const creReassignedAssignment =
      candidateWithoutHistories.recruiterAssignments.find(
      (assignment) =>
        assignment.assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_REASSIGNED &&
        assignment.isActive,
    );
    const isCREReassigned = !!creReassignedAssignment;
    const histories = statusHistories ?? [];

    const [projectAssignments, activityDocuments, pipelineUpdatesCount] =
      await Promise.all([
        this.prisma.candidateProjects.findMany({
          where: { candidateId: id },
          select: {
            currentProjectStatus: {
              select: { statusName: true },
            },
          },
        }),
        this.prisma.document.findMany({
          where: { candidateId: id, isDeleted: false },
          select: { status: true },
        }),
        this.prisma.candidateStatusHistory.count({
          where: { candidateId: id },
        }),
      ]);

    const activitySnapshot = computeCandidateActivitySnapshot({
      projects: projectAssignments,
      documents: activityDocuments,
      pipelineSteps: pipelineUpdatesCount,
      profileCompletion: base.profileCompletion?.percent ?? 0,
    });

    return {
      ...base,
      documents: documents ?? [],
      passportNumber: resolvePassportNumberForCandidate({
        passportNumber: candidate.passportNumber,
        documents: documents ?? [],
      }),
      currentStatus: base.currentStatus,
      recruiter: activeAssignment?.recruiter || null,
      createdBy,
      isCREReassigned,
      creStatusNote: isCREReassigned
        ? resolveCreHandoffNote(creReassignedAssignment, histories)
        : null,
      creStatus: isCREReassigned
        ? resolveCreHandoffStatus(creReassignedAssignment, histories)
        : null,
      careerGapAnalysis: calculateCareerGaps(
        candidateWithoutHistories.workExperiences ?? [],
        candidateWithoutHistories.qualifications ?? [],
      ),
      activitySnapshot,
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

    if (user?.userRoles?.some((ur) => isOperationsRole(ur.role?.name ?? ''))) {
      throw new ForbiddenException('Operations users cannot update candidate details.');
    }

    // Check if countryCode and mobileNumber combination is being updated and if it already exists
    if (
      (updateCandidateDto.countryCode || updateCandidateDto.mobileNumber) &&
      (updateCandidateDto.countryCode !== existingCandidate.countryCode ||
        updateCandidateDto.mobileNumber !== existingCandidate.mobileNumber)
    ) {
      const countryCode =
        updateCandidateDto.countryCode ?? existingCandidate.countryCode;
      const mobileNumber =
        updateCandidateDto.mobileNumber ?? existingCandidate.mobileNumber;

      if (countryCode && mobileNumber) {
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
      updateData.address = updateCandidateDto.address?.trim() || null;
    if (updateCandidateDto.addressPincode !== undefined) {
      const pincode = updateCandidateDto.addressPincode;
      updateData.addressPincode =
        pincode === null ? null : String(pincode).trim() || null;
    }
    if (updateCandidateDto.alternatePhone !== undefined)
      updateData.alternatePhone =
        updateCandidateDto.alternatePhone?.trim() || null;
    if (updateCandidateDto.passportNumber !== undefined) {
      const normalizedPassport = normalizePassportNumber(
        updateCandidateDto.passportNumber,
      );
      if (normalizedPassport && normalizedPassport.length < 3) {
        throw new BadRequestException(
          'Passport number must be at least 3 characters',
        );
      }
      if (normalizedPassport) {
        const passportConflict = await findExistingCandidateByPassport(
          this.prisma,
          normalizedPassport,
          id,
        );
        if (passportConflict) {
          throw new ConflictException(
            `Candidate with passport number ${normalizedPassport} already exists`,
          );
        }
      }
      updateData.passportNumber = normalizedPassport;
    }
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
    if (updateCandidateDto.professionTypeId !== undefined) {
      await this.assertValidProfessionType(updateCandidateDto.professionTypeId);
      updateData.professionTypeId = updateCandidateDto.professionTypeId;
    }
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
    if (updateCandidateDto.religionId !== undefined) {
      const religionId =
        updateCandidateDto.religionId === '' ||
        updateCandidateDto.religionId === null
          ? null
          : updateCandidateDto.religionId;
      await this.assertValidReligionId(religionId);
      updateData.religionId = religionId;
    }
    if (updateCandidateDto.licensingExam !== undefined)
      updateData.licensingExam = updateCandidateDto.licensingExam;
    if (updateCandidateDto.dataFlow !== undefined)
      updateData.dataFlow = updateCandidateDto.dataFlow;
    if (updateCandidateDto.eligibility !== undefined) {
      updateData.eligibility = updateCandidateDto.eligibility;
      if (!updateCandidateDto.eligibility) {
        updateData.eligibilityNumber = null;
      }
    }
    if (updateCandidateDto.eligibilityNumber !== undefined) {
      updateData.eligibilityNumber =
        updateCandidateDto.eligibilityNumber?.trim() || null;
    }
    const resolvedEligibility =
      updateCandidateDto.eligibility !== undefined
        ? updateCandidateDto.eligibility
        : existingCandidate.eligibility;
    const resolvedEligibilityNumber =
      updateData.eligibilityNumber !== undefined
        ? updateData.eligibilityNumber
        : updateCandidateDto.eligibility === false
          ? null
          : existingCandidate.eligibilityNumber;
    this.assertEligibilityNumberRequired(
      resolvedEligibility,
      resolvedEligibilityNumber,
    );
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
    if (updateCandidateDto.preferredRoles !== undefined) {
      await this.assertValidPreferredRoles(updateCandidateDto.preferredRoles);
      updateData.rolePreferences = {
        deleteMany: {},
        create: updateCandidateDto.preferredRoles.map((roleCatalogId) => ({
          roleCatalog: { connect: { id: roleCatalogId } },
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
      preferredCountries: {
        include: { country: true },
      },
      facilityPreferences: true,
      religion: {
        select: { id: true, name: true },
      },
      professionType: {
        select: {
          id: true,
          name: true,
          label: true,
        },
      },
      rolePreferences: {
        include: {
          roleCatalog: {
            include: {
              roleDepartment: true,
            },
          },
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

    if (
      resolvedEligibility === true &&
      resolvedEligibilityNumber?.trim()
    ) {
      await syncEligibilityLetterDocumentNumberFromCandidate(
        this.prisma,
        id,
        resolvedEligibilityNumber,
      );
    }

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
        ['System Admin', ROLE_NAMES.OPERATIONS].includes(ur.role.name) ||
        ur.role.name === 'CRE'
      );

      if (!isAdminOrCRE) {
        throw new ForbiddenException(
          'Candidate is currently being handled by Operations and cannot be assigned to projects until handed back to recruiter.',
        );
      }
    }

    await this.assertRecruiterCanManageLockedRnrCandidate(candidateId, userId);

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

    await assertCandidateNotBlockedForNewProjectAssignment(
      this.prisma,
      candidateId,
      assignProjectDto.projectId,
    );

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
        status: 'IN_PROGRESS',
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
      where: withActiveAccountStatus({
        userRoles: {
          some: {
            role: {
              name: 'Recruiter',
            },
          },
        },
      }),
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
        ['System Admin', ROLE_NAMES.OPERATIONS].includes(ur.role.name) ||
        ur.role.name === 'CRE'
      );

      if (!isAdminOrCRE) {
        throw new ForbiddenException(
          'Candidate is currently being handled by Operations and cannot be nominated to projects until handed back to recruiter.',
        );
      }
    }

    await this.assertRecruiterCanManageLockedRnrCandidate(candidateId, nominatorId);

    await assertCandidateNotBlockedForNewProjectAssignment(
      this.prisma,
      candidateId,
      nominateDto.projectId,
    );

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
      where: withActiveAccountStatus({
        userRoles: {
          some: {
            role: {
              name: {
                in: ['Documentation Executive', 'Processing Executive'],
              },
            },
          },
        },
      }),
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

    const isCallBackTarget =
      this.callbackRemindersService.isCallBackStatusName(status.statusName);
    if (isCallBackTarget && !updateStatusDto.callbackAt) {
      throw new BadRequestException(
        'callbackAt is required when status is Call Back',
      );
    }

    let previousStatusName = '';
    if (candidate.currentStatusId) {
      const previousStatus = await this.prisma.candidateStatus.findUnique({
        where: { id: candidate.currentStatusId },
      });
      previousStatusName = previousStatus?.statusName ?? '';
    }

    const isRnrPrevious = previousStatusName.toLowerCase().trim() === 'rnr';
    const isRnrNew = status.statusName.toLowerCase().trim() === 'rnr';
    const isCallBackPrevious =
      this.callbackRemindersService.isCallBackStatusName(previousStatusName);
    const isCallBackNew = isCallBackTarget;

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

    if (user?.userRoles?.some((ur) => isOperationsRole(ur.role?.name ?? ''))) {
      throw new ForbiddenException('Operations users cannot update candidate status.');
    }

    await this.assertRecruiterCanManageLockedRnrCandidate(candidateId, userId);

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
    if (isRnrNew) {
      this.logger.log(
        `Candidate ${candidateId} status changed to RNR. Creating reminder...`,
      );

      try {
        await this.rnrRemindersService.createRNRReminder(
          candidateId,
          userId,
          statusHistory.id,
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

    if (isRnrPrevious && !isRnrNew) {
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

    // ===== CALLBACK REMINDER LOGIC START =====
    if (isCallBackNew && updateStatusDto.callbackAt) {
      this.logger.log(
        `Candidate ${candidateId} status set to Call Back. Scheduling reminder...`,
      );

      try {
        await this.callbackRemindersService.createCallbackReminder(
          candidateId,
          userId,
          statusHistory.id,
          updateStatusDto.callbackAt,
        );
      } catch (error) {
        this.logger.error(
          `Failed to create callback reminder for candidate ${candidateId}:`,
          error,
        );
        throw error;
      }
    }

    if (isCallBackPrevious && !isCallBackNew) {
      try {
        await this.callbackRemindersService.cancelCallbackReminders(candidateId);
      } catch (error) {
        this.logger.error(
          `Failed to cancel callback reminders for candidate ${candidateId}:`,
          error,
        );
      }
    }
    // ===== CALLBACK REMINDER LOGIC END =====

    // ===== WHATSAPP NOTIFICATION START =====
    // Send WhatsApp notification to candidate about status change
    try {
      const phoneNumber =
        updatedCandidate.countryCode && updatedCandidate.mobileNumber
          ? this.whatsAppService.validatePhoneNumber(
              updatedCandidate.countryCode,
              updatedCandidate.mobileNumber,
            )
          : null;

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
   * RNR candidates stay locked for recruiters until Operations hands them back
   * with a cre_reassigned assignment.
   */
  async isRecruiterLockedRnrCandidate(candidateId: string): Promise<boolean> {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        currentStatus: { select: { statusName: true } },
        recruiterAssignments: {
          where: { isActive: true },
          select: { assignmentType: true },
        },
      },
    });

    if (!candidate) {
      return false;
    }

    const isCREReassigned = candidate.recruiterAssignments.some(
      (assignment) =>
        assignment.assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_REASSIGNED,
    );
    if (isCREReassigned) {
      return false;
    }

    const statusName = candidate.currentStatus?.statusName?.toLowerCase().trim();
    return statusName === CANDIDATE_STATUS.RNR.toLowerCase();
  }

  private async assertRecruiterCanManageLockedRnrCandidate(
    candidateId: string,
    userId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });

    const roleNames = user?.userRoles.map((ur) => ur.role.name) ?? [];
    const isExempt = roleNames.some((role) =>
      [
        'CEO',
        'Director',
        'Manager',
        'Team Head',
        'Team Lead',
        'Admin',
        'SuperAdmin',
        'System Admin',
      ].includes(role),
    );
    if (isExempt) {
      return;
    }

    const isRecruiterLike =
      roleNames.includes('Recruiter') ||
      roleNames.includes(ROLE_NAMES.AGENT_COORDINATOR);
    if (!isRecruiterLike) {
      return;
    }

    if (await this.isRecruiterLockedRnrCandidate(candidateId)) {
      throw new ForbiddenException(
        'This candidate is in RNR and is with Operations. You can update status and assign to projects only after Operations reassigns them back to you.',
      );
    }
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

  private resolveOverviewTargetRecruiterId(
    query: QueryCandidateOverviewDto,
    userId: string,
    roles: string[],
  ): string | undefined {
    if (roles.includes('Recruiter')) {
      return userId;
    }
    return query.recruiterId;
  }

  private buildOverviewBaseScopeWhere(
    query: QueryCandidateOverviewDto,
    userId: string,
    roles: string[],
  ): {
    baseWhereForCounts: Prisma.CandidateWhereInput;
    targetRecruiterId?: string;
  } {
    const targetRecruiterId = this.resolveOverviewTargetRecruiterId(
      query,
      userId,
      roles,
    );
    const where: Prisma.CandidateWhereInput = {};

    if (targetRecruiterId && targetRecruiterId !== 'all') {
      const existingAnd = Array.isArray(where.AND)
        ? where.AND
        : where.AND
          ? [where.AND]
          : [];
      where.AND = [
        ...existingAnd,
        this.buildRecruiterOverviewScope(targetRecruiterId),
      ];
    }

    this.candidateListFilterService.applyCreatedAtFilter(where, query);
    this.candidateListFilterService.applySearchFilter(where, query.search);
    this.candidateListFilterService.applyAdvancedListFilters(where, query);

    return {
      baseWhereForCounts: this.cloneOverviewScopeWhere(where),
      targetRecruiterId,
    };
  }

  /**
   * Dashboard tile counts for recruiter candidate overview (no list / tile status filter).
   */
  async getCandidateOverviewStats(
    query: QueryCandidateOverviewDto,
    userId: string,
    roles: string[],
  ): Promise<{
    total: number;
    positive: number;
    untouched: number;
    negative: number;
    profileShortlisting: number;
    nominated: number;
    registered: number;
    documentation: number;
    screening: number;
    interview: number;
    processing: number;
    interviewAssigned: number;
    documentReceived: number;
    medical: number;
    visa: number;
    deployed: number;
    registeredSubStatus: {
      tiles: Array<{
        key: string;
        subStatusName: string;
        label: string;
        count: number;
      }>;
    };
    screeningSubStatus: {
      tiles: Array<{
        key: string;
        subStatusName: string;
        label: string;
        count: number;
      }>;
    };
    interviewSubStatus: {
      tiles: Array<{
        key: string;
        subStatusName: string;
        label: string;
        count: number;
      }>;
    };
    processingSubStatus: {
      tiles: Array<{
        key: string;
        subStatusName: string;
        label: string;
        count: number;
      }>;
    };
  }> {
    const { baseWhereForCounts, targetRecruiterId } =
      this.buildOverviewBaseScopeWhere(query, userId, roles);

    const workflowProjectScope: Prisma.CandidateProjectsWhereInput =
      targetRecruiterId && targetRecruiterId !== 'all'
        ? { recruiterId: targetRecruiterId }
        : {};

    const [positiveStatusIds, negativeStatusIds] = await Promise.all([
      this.resolveCrmStatusIds(POSITIVE_CRM_STATUS_NAMES),
      this.resolveCrmStatusIds(NEGATIVE_CRM_STATUS_NAMES),
    ]);
    const positiveCurrentStatusFilter =
      this.buildPositiveCrmStatusFilter(positiveStatusIds);
    const negativeCurrentStatusFilter: Prisma.CandidateWhereInput =
      negativeStatusIds.length > 0
        ? { currentStatusId: { in: negativeStatusIds } }
        : {
            currentStatus: {
              OR: NEGATIVE_CRM_STATUS_NAMES.map((statusName) => ({
                statusName: { equals: statusName, mode: 'insensitive' },
              })),
            },
          };

    const overviewCountResults = await Promise.all([
      this.prisma.candidate.count({ where: baseWhereForCounts }),
      this.prisma.candidate.count({
        where: this.mergeOverviewWhere(
          baseWhereForCounts,
          positiveCurrentStatusFilter,
        ),
      }),
      this.prisma.candidate.count({
        where: {
          ...baseWhereForCounts,
          currentStatus: { statusName: 'Untouched' },
          projects: { none: {} },
        },
      }),
      this.prisma.candidate.count({
        where: this.mergeOverviewWhere(
          baseWhereForCounts,
          negativeCurrentStatusFilter,
        ),
      }),
      this.prisma.candidate.count({
        where: {
          ...baseWhereForCounts,
          projects: { some: { mainStatus: { name: 'nominated' } } },
        },
      }),
      this.prisma.candidate.count({
        where: {
          ...baseWhereForCounts,
          projects: {
            some: {
              mainStatus: { name: 'documents' },
              subStatus: {
                name: { in: [...REGISTERED_DOC_SUB_STATUSES] },
              },
            },
          },
        },
      }),
      this.prisma.candidate.count({
        where: {
          ...baseWhereForCounts,
          projects: { some: { mainStatus: { name: 'documents' } } },
        },
      }),
      this.countCandidatesWithAnySubStatusHistory(
        baseWhereForCounts,
        workflowProjectScope,
        [...SCREENING_TRAINING_SUB_STATUS_NAMES],
      ),
      this.countCandidatesWithAnySubStatusHistory(
        baseWhereForCounts,
        workflowProjectScope,
        [...CLIENT_INTERVIEW_SUB_STATUS_NAMES],
      ),
      this.prisma.candidate.count({
        where: {
          ...baseWhereForCounts,
          projects: { some: { mainStatus: { name: 'processing' } } },
        },
      }),
      this.prisma.candidate.count({
        where: {
          ...baseWhereForCounts,
          OR: [
            { currentStatus: { statusName: 'Deployed' } },
            { projects: { some: { subStatus: { name: 'hired' } } } },
          ],
        },
      }),
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
      ...REGISTERED_SUB_STATUS_TILES.map((tile) =>
        this.countCandidatesWithSubStatusHistory(
          baseWhereForCounts,
          workflowProjectScope,
          tile.subStatusName,
        ),
      ),
      ...SCREENING_SUB_STATUS_TILES.map((tile) =>
        this.countCandidatesWithSubStatusHistory(
          baseWhereForCounts,
          workflowProjectScope,
          tile.subStatusName,
        ),
      ),
      this.countCandidatesWithAnySubStatusHistory(
        baseWhereForCounts,
        workflowProjectScope,
        [...TRAINING_SUB_STATUS_NAMES],
      ),
      ...INTERVIEW_SUB_STATUS_TILES.map((tile) =>
        this.countCandidatesWithSubStatusHistory(
          baseWhereForCounts,
          workflowProjectScope,
          tile.subStatusName,
        ),
      ),
      ...PROCESSING_SUB_STATUS_TILES.map((tile) =>
        this.countCandidatesWithSubStatusHistory(
          baseWhereForCounts,
          workflowProjectScope,
          tile.subStatusName,
        ),
      ),
    ]);

    const [
      totalCandidatesCount,
      positiveCandidates,
      untouchedCandidates,
      negativeCandidates,
      profileShortlistingCandidates,
      registeredCandidates,
      documentationCandidates,
      screeningCandidates,
      interviewCandidates,
      processingCandidates,
      deployedCandidatesCount,
      interviewAssignedCandidates,
      docReceivedCandidates,
      medicalCandidates,
      visaCandidates,
    ] = overviewCountResults.slice(0, 15) as number[];

    const registeredSubStatusCounts = overviewCountResults.slice(
      15,
      15 + REGISTERED_SUB_STATUS_TILES.length,
    ) as number[];
    const screeningSubStatusCounts = overviewCountResults.slice(
      15 + REGISTERED_SUB_STATUS_TILES.length,
      15 +
        REGISTERED_SUB_STATUS_TILES.length +
        SCREENING_SUB_STATUS_TILES.length,
    ) as number[];
    const screeningTrainingGroupedCount = overviewCountResults[
      15 +
        REGISTERED_SUB_STATUS_TILES.length +
        SCREENING_SUB_STATUS_TILES.length
    ] as number;
    const interviewSubStatusCounts = overviewCountResults.slice(
      15 +
        REGISTERED_SUB_STATUS_TILES.length +
        SCREENING_SUB_STATUS_TILES.length +
        1,
      15 +
        REGISTERED_SUB_STATUS_TILES.length +
        SCREENING_SUB_STATUS_TILES.length +
        1 +
        INTERVIEW_SUB_STATUS_TILES.length,
    ) as number[];
    const processingSubStatusCounts = overviewCountResults.slice(
      15 +
        REGISTERED_SUB_STATUS_TILES.length +
        SCREENING_SUB_STATUS_TILES.length +
        1 +
        INTERVIEW_SUB_STATUS_TILES.length,
    ) as number[];

    return {
      total: totalCandidatesCount,
      positive: positiveCandidates,
      untouched: untouchedCandidates,
      negative: negativeCandidates,
      profileShortlisting: profileShortlistingCandidates,
      nominated: profileShortlistingCandidates,
      registered: registeredCandidates,
      documentation: documentationCandidates,
      screening: screeningCandidates,
      interview: interviewCandidates,
      processing: processingCandidates,
      interviewAssigned: interviewAssignedCandidates,
      documentReceived: docReceivedCandidates,
      medical: medicalCandidates,
      visa: visaCandidates,
      deployed: deployedCandidatesCount,
      registeredSubStatus: {
        tiles: REGISTERED_SUB_STATUS_TILES.map((tile, index) => ({
          key: tile.key,
          subStatusName: tile.subStatusName,
          label: tile.label,
          count: registeredSubStatusCounts[index],
        })),
      },
      screeningSubStatus: {
        tiles: [
          ...SCREENING_SUB_STATUS_TILES.map((tile, index) => ({
            key: tile.key,
            subStatusName: tile.subStatusName,
            label: tile.label,
            count: screeningSubStatusCounts[index],
          })),
          {
            key: 'training',
            subStatusName: 'training_assigned',
            label: 'Training',
            count: screeningTrainingGroupedCount,
          },
        ],
      },
      interviewSubStatus: {
        tiles: INTERVIEW_SUB_STATUS_TILES.map((tile, index) => ({
          key: tile.key,
          subStatusName: tile.subStatusName,
          label: tile.label,
          count: interviewSubStatusCounts[index],
        })),
      },
      processingSubStatus: {
        tiles: PROCESSING_SUB_STATUS_TILES.map((tile, index) => ({
          key: tile.key,
          subStatusName: tile.subStatusName,
          label: tile.label,
          count: processingSubStatusCounts[index],
        })),
      },
    };
  }

  /** List filter: candidates with project history entry for a workflow sub-status. */
  private buildWorkflowSubStatusProjectFilter(
    mainStatusName: string,
    subStatusName: string,
    targetRecruiterId?: string,
  ): Prisma.CandidateWhereInput['projects'] {
    return {
      some: {
        ...(targetRecruiterId && targetRecruiterId !== 'all'
          ? { recruiterId: targetRecruiterId }
          : {}),
        mainStatus: { name: mainStatusName },
        projectStatusHistory: {
          some: {
            subStatus: { name: subStatusName },
          },
        },
      },
    };
  }

  /** Unique candidates who reached a project sub-status at least once (history). */
  private countCandidatesWithSubStatusHistory(
    baseWhereForCounts: Prisma.CandidateWhereInput,
    projectScope: Prisma.CandidateProjectsWhereInput,
    subStatusName: string,
  ) {
    return this.prisma.candidate.count({
      where: this.mergeOverviewWhere(baseWhereForCounts, {
        projects: {
          some: {
            ...projectScope,
            projectStatusHistory: {
              some: {
                subStatus: { name: subStatusName },
              },
            },
          },
        },
      }),
    });
  }

  /** Unique candidates who reached any of the given sub-statuses at least once (history). */
  private countCandidatesWithAnySubStatusHistory(
    baseWhereForCounts: Prisma.CandidateWhereInput,
    projectScope: Prisma.CandidateProjectsWhereInput,
    subStatusNames: readonly string[],
  ) {
    return this.prisma.candidate.count({
      where: this.mergeOverviewWhere(baseWhereForCounts, {
        projects: {
          some: {
            ...projectScope,
            projectStatusHistory: {
              some: {
                subStatus: { name: { in: [...subStatusNames] } },
              },
            },
          },
        },
      }),
    });
  }

  /** List filter: candidates with project history in any of the given sub-statuses. */
  private buildWorkflowAnySubStatusProjectFilter(
    subStatusNames: readonly string[],
    targetRecruiterId?: string,
  ): Prisma.CandidateWhereInput['projects'] {
    return {
      some: {
        ...(targetRecruiterId && targetRecruiterId !== 'all'
          ? { recruiterId: targetRecruiterId }
          : {}),
        projectStatusHistory: {
          some: {
            subStatus: { name: { in: [...subStatusNames] } },
          },
        },
      },
    };
  }

  /**
   * Get candidate overview list for a specific recruiter or all (admin)
   */
  async getCandidateOverview(
    query: QueryCandidateOverviewDto,
    userId: string,
    roles: string[],
  ): Promise<any> {
    const { baseWhereForCounts, targetRecruiterId } =
      this.buildOverviewBaseScopeWhere(query, userId, roles);

    const [positiveStatusIds, negativeStatusIds] = await Promise.all([
      this.resolveCrmStatusIds(POSITIVE_CRM_STATUS_NAMES),
      this.resolveCrmStatusIds(NEGATIVE_CRM_STATUS_NAMES),
    ]);
    const positiveCurrentStatusFilter =
      this.buildPositiveCrmStatusFilter(positiveStatusIds);
    const negativeCurrentStatusFilter: Prisma.CandidateWhereInput =
      negativeStatusIds.length > 0
        ? { currentStatusId: { in: negativeStatusIds } }
        : {
            currentStatus: {
              OR: NEGATIVE_CRM_STATUS_NAMES.map((statusName) => ({
                statusName: { equals: statusName, mode: 'insensitive' },
              })),
            },
          };

    const tableWhere = this.cloneOverviewScopeWhere(baseWhereForCounts);

    const rawTileStatus = query.currentStatus || query.status;
    const statusValue = rawTileStatus ? rawTileStatus.toLowerCase() : '';
    const usesWorkflowHistorySubStatus =
      !!query.subStatus &&
      ['registered', 'screening', 'interview', 'processing'].includes(statusValue);

    // Main and sub-status filtering (current status); skipped when workflow history filter applies
    if ((query.mainStatus || query.subStatus) && !usesWorkflowHistorySubStatus) {
      if (!tableWhere.projects) {
        tableWhere.projects = {
          some: {
            ...(query.mainStatus ? { mainStatus: { name: query.mainStatus } } : {}),
            ...(query.subStatus ? { subStatus: { name: query.subStatus } } : {}),
          },
        };
      } else if (tableWhere.projects.some) {
        // Merge with existing projects.some filters
        tableWhere.projects.some = {
          ...tableWhere.projects.some,
          ...(query.mainStatus ? { mainStatus: { name: query.mainStatus } } : {}),
          ...(query.subStatus ? { subStatus: { name: query.subStatus } } : {}),
        };
      }
    }

    if (query.processingStep) {
      tableWhere.projects = {
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

    if (statusValue && statusValue !== 'all') {
      if (
        statusValue === 'profile_shortlisting' ||
        statusValue === 'nominated'
      ) {
        tableWhere.projects = {
          some: {
            mainStatus: { name: 'nominated' },
            ...(query.subStatus ? { subStatus: { name: query.subStatus } } : {}),
          },
        };
      } else if (statusValue === 'registered') {
        tableWhere.projects = query.subStatus
          ? this.buildWorkflowSubStatusProjectFilter(
              'documents',
              query.subStatus,
              targetRecruiterId,
            )
          : {
              some: {
                mainStatus: { name: 'documents' },
                subStatus: {
                  name: { in: [...REGISTERED_DOC_SUB_STATUSES] },
                },
              },
            };
      } else if (statusValue === 'positive') {
        const existingAnd = Array.isArray(tableWhere.AND)
          ? tableWhere.AND
          : tableWhere.AND
            ? [tableWhere.AND]
            : [];
        tableWhere.AND = [...existingAnd, positiveCurrentStatusFilter];
      } else if (statusValue === 'negative') {
        const existingAnd = Array.isArray(tableWhere.AND)
          ? tableWhere.AND
          : tableWhere.AND
            ? [tableWhere.AND]
            : [];
        tableWhere.AND = [...existingAnd, negativeCurrentStatusFilter];
      } else if (statusValue === 'untouched') {
        tableWhere.currentStatus = { statusName: 'Untouched' };
        tableWhere.projects = { none: {} };
      } else if (statusValue === 'call_back') {
        tableWhere.currentStatus = { statusName: 'Call Back' };
        tableWhere.projects = { none: {} };
      } else if (statusValue === 'documentation') {
        tableWhere.projects = {
          some: {
            mainStatus: { name: 'documents' },
            ...(query.subStatus ? { subStatus: { name: query.subStatus } } : {}),
          },
        };
      } else if (statusValue === 'screening') {
        if (query.subStatus === 'training_assigned') {
          tableWhere.projects = this.buildWorkflowAnySubStatusProjectFilter(
            [...TRAINING_SUB_STATUS_NAMES],
            targetRecruiterId,
          );
        } else {
          tableWhere.projects = query.subStatus
            ? this.buildWorkflowSubStatusProjectFilter(
                'interview',
                query.subStatus,
                targetRecruiterId,
              )
            : this.buildWorkflowAnySubStatusProjectFilter(
                [...SCREENING_TRAINING_SUB_STATUS_NAMES],
                targetRecruiterId,
              );
        }
      } else if (statusValue === 'interview') {
        tableWhere.projects = query.subStatus
          ? this.buildWorkflowSubStatusProjectFilter(
              'interview',
              query.subStatus,
              targetRecruiterId,
            )
          : this.buildWorkflowAnySubStatusProjectFilter(
              [...CLIENT_INTERVIEW_SUB_STATUS_NAMES],
              targetRecruiterId,
            );
      } else if (statusValue === 'processing') {
        tableWhere.projects = query.subStatus
          ? this.buildWorkflowSubStatusProjectFilter(
              'processing',
              query.subStatus,
              targetRecruiterId,
            )
          : {
              some: {
                mainStatus: { name: 'processing' },
              },
            };
      } else if (statusValue === 'deployed') {
        tableWhere.OR = [
          { currentStatus: { statusName: 'Deployed' } },
          { projects: { some: { subStatus: { name: 'hired' } } } },
        ];
      } else if (statusValue === 'interested' || statusValue === 'qualified') {
        tableWhere.OR = [
          { currentStatus: { statusName: { in: ['Interested', 'Qualified', 'Deployed'] } } },
          { projects: { some: {} } },
        ];
      } else if (
        [
          'not_interested',
          'not_eligible',
          'other_enquiry',
          'future',
          'on_hold',
          'rnr',
        ].includes(statusValue)
      ) {
        const statusNameMap: Record<string, string> = {
          not_interested: 'Not Interested',
          not_eligible: 'Not Eligible',
          other_enquiry: 'Other Enquiry',
          future: 'Future',
          on_hold: 'On Hold',
          rnr: 'RNR',
        };
        tableWhere.currentStatus = {
          statusName: statusNameMap[statusValue] ?? statusValue,
        };
        tableWhere.projects = { none: {} };
      } else if (statusValue === 'interview_assigned') {
        // Updated logic: Filter by candidates who have EVER been in specific interview sub-statuses
        tableWhere.projects = {
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
        tableWhere.projects = {
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
        tableWhere.projects = {
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
        tableWhere.projects = {
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
        tableWhere.currentStatus = {
          statusName: { contains: statusValue, mode: 'insensitive' },
        };
      }
    }

    const tableTotalCount = await this.prisma.candidate.count({
      where: tableWhere,
    });

    // Pagination for the table
    const page = query.page || 1;
    const limit = query.limit || 10;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const skip = (page - 1) * limit;

    // Define the projects filtering based on current status/mainStatus
    let projectsFilter: any = undefined;
    const listStatusValue = statusValue;

    if (query.mainStatus || query.subStatus) {
      projectsFilter = {
        where: {
          ...(query.mainStatus ? { mainStatus: { name: query.mainStatus } } : {}),
          ...(query.subStatus ? { subStatus: { name: query.subStatus } } : {}),
        },
      };
    } else if (listStatusValue === 'interview') {
      projectsFilter = { where: { mainStatus: { name: 'interview' } } };
    } else if (listStatusValue === 'documentation') {
      projectsFilter = { where: { mainStatus: { name: 'documents' } } };
    } else if (listStatusValue === 'processing') {
      projectsFilter = { where: { mainStatus: { name: 'processing' } } };
    } else if (
      listStatusValue === 'profile_shortlisting' ||
      listStatusValue === 'nominated'
    ) {
      projectsFilter = { where: { mainStatus: { name: 'nominated' } } };
    } else if (listStatusValue === 'registered') {
      projectsFilter = {
        where: {
          mainStatus: { name: 'documents' },
          subStatus: { name: { in: [...REGISTERED_DOC_SUB_STATUSES] } },
        },
      };
    } else if (listStatusValue === 'interview_assigned') {
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
      where: tableWhere,
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
            creStatus: {
              select: { id: true, statusName: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        documents: {
          where: { isDeleted: false },
          select: { docType: true, documentNumber: true },
        },
        statusHistories: {
          orderBy: { statusUpdatedAt: 'desc' },
          take: 15,
          select: {
            statusId: true,
            statusNameSnapshot: true,
            reason: true,
            statusUpdatedAt: true,
            status: { select: { id: true, statusName: true } },
          },
        },
        workExperiences: candidateWorkExperiencesInclude,
        qualifications: candidateQualificationsInclude,
      },
      orderBy: { [sortBy as string]: sortOrder },
      skip,
      take: limit,
    });

    const candidates = candidatesData.map((c) => {
      const activeAssignment = c.recruiterAssignments?.find((a) => a.isActive);
      const recruiterAssignment =
        targetRecruiterId && targetRecruiterId !== 'all'
          ? c.recruiterAssignments.find(
              (a) => a.isActive && a.recruiterId === targetRecruiterId,
            )
          : activeAssignment;
      const creReassignedAssignment = c.recruiterAssignments.find(
        (a) =>
          a.isActive &&
          a.assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_REASSIGNED,
      );
      const firstAssignment = c.recruiterAssignments?.[0]; // The one who created the first engagement
      const latestProject = c.projects?.[0] as any;
      const statusHistories = c.statusHistories ?? [];

      const creAssignment = c.recruiterAssignments.find(
        (a) =>
          a.isActive &&
          (a.assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_AUTO ||
            a.assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_MANUAL),
      );
      const isHandledByCRE = !!creAssignment;
      const isCREReassigned = !!creReassignedAssignment;

      // Destructure to remove projects array from the final response object
      const {
        projects,
        documents,
        statusHistories: _omitHistories,
        ...candidateRest
      } = c as typeof c & {
        documents?: Array<{ docType: string; documentNumber?: string | null }>;
      };

      const withCompletion = withProfileCompletion({
        ...candidateRest,
        currentStatus: c.currentStatus,
        documents: documents ?? [],
      });

      return {
        ...withCompletion,
        passportNumber: resolvePassportNumberForCandidate({
          passportNumber: c.passportNumber,
          documents: documents ?? [],
        }),
        careerGapAnalysis: calculateCareerGaps(
          c.workExperiences ?? [],
          c.qualifications ?? [],
        ),
        isHandledByCRE,
        isCREReassigned,
        creStatusNote: isCREReassigned
          ? resolveCreHandoffNote(creReassignedAssignment, statusHistories)
          : null,
        creStatus: isCREReassigned
          ? resolveCreHandoffStatus(creReassignedAssignment, statusHistories)
          : null,
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

    const countBaseWhere: typeof projectWhere = {
      candidateId,
      mainStatus: {
        name: {
          equals: 'documents',
          mode: 'insensitive',
        },
      },
    };
    if (search) {
      countBaseWhere.project = {
        title: {
          contains: search,
          mode: 'insensitive',
        },
      };
    }

    const subStatusGrouped = await this.prisma.candidateProjects.groupBy({
      by: ['subStatusId'],
      where: countBaseWhere,
      _count: { _all: true },
    });

    const subStatusCounts = subStatusGrouped.map((row) => ({
      subStatusId: row.subStatusId,
      count: row._count._all,
    }));
    const totalAll = subStatusCounts.reduce((sum, row) => sum + row.count, 0);

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
      subStatusCounts,
      totalAll,
      pagination: {
        total: totalProjects,
        page,
        limit,
        totalPages: Math.ceil(totalProjects / limit),
      },
    };
  }

  /**
   * Get client interview workflow details for a candidate
   * Includes only project info and client interviews (excludes screening/training)
   */
  async getCandidateInterviewWorkflow(
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

    if (!candidateInfo) return null;

    const projectWhere: Prisma.CandidateProjectsWhereInput = {
      candidateId,
      mainStatus: {
        name: {
          equals: 'interview',
          mode: 'insensitive',
        },
      },
      subStatus: {
        name: { in: [...CLIENT_INTERVIEW_SUB_STATUS_NAMES] },
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

    const countBaseWhere: Prisma.CandidateProjectsWhereInput = {
      candidateId,
      mainStatus: {
        name: {
          equals: 'interview',
          mode: 'insensitive',
        },
      },
      subStatus: {
        name: { in: [...CLIENT_INTERVIEW_SUB_STATUS_NAMES] },
      },
    };
    if (search) {
      countBaseWhere.project = {
        title: {
          contains: search,
          mode: 'insensitive',
        },
      };
    }

    const subStatusGrouped = await this.prisma.candidateProjects.groupBy({
      by: ['subStatusId'],
      where: countBaseWhere,
      _count: { _all: true },
    });

    const subStatusCounts = subStatusGrouped.map((row) => ({
      subStatusId: row.subStatusId,
      count: row._count._all,
    }));
    const totalAll = subStatusCounts.reduce((sum, row) => sum + row.count, 0);

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

    const projectsWithSchedulingInfo = await Promise.all(
      projects.map(async (project) => {
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
          interviews: interviewsWithScheduler,
        };
      }),
    );

    return {
      candidate: candidateInfo,
      projects: projectsWithSchedulingInfo,
      subStatusCounts,
      totalAll,
      pagination: {
        total: totalProjects,
        page,
        limit,
        totalPages: Math.ceil(totalProjects / limit),
      },
    };
  }

  /**
   * Get screening + training workflow details for a candidate
   * Includes internal screenings and training assignments (excludes client interviews)
   */
  async getCandidateScreeningWorkflow(
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

    if (!candidateInfo) return null;

    const projectWhere: Prisma.CandidateProjectsWhereInput = {
      candidateId,
      mainStatus: {
        name: {
          equals: 'interview',
          mode: 'insensitive',
        },
      },
      subStatus: {
        name: { in: [...SCREENING_TRAINING_SUB_STATUS_NAMES] },
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

    const countBaseWhere: Prisma.CandidateProjectsWhereInput = {
      candidateId,
      mainStatus: {
        name: {
          equals: 'interview',
          mode: 'insensitive',
        },
      },
      subStatus: {
        name: { in: [...SCREENING_TRAINING_SUB_STATUS_NAMES] },
      },
    };
    if (search) {
      countBaseWhere.project = {
        title: {
          contains: search,
          mode: 'insensitive',
        },
      };
    }

    const subStatusGrouped = await this.prisma.candidateProjects.groupBy({
      by: ['subStatusId'],
      where: countBaseWhere,
      _count: { _all: true },
    });

    const subStatusCounts = subStatusGrouped.map((row) => ({
      subStatusId: row.subStatusId,
      count: row._count._all,
    }));
    const totalAll = subStatusCounts.reduce((sum, row) => sum + row.count, 0);

    const totalProjects = await this.prisma.candidateProjects.count({
      where: projectWhere,
    });

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
        trainingAssignments: {
          orderBy: { assignedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const trainerIds = new Set<string>();
    projects.forEach((project) => {
      project.trainingAssignments.forEach((training) => {
        if (training.trainerId) {
          trainerIds.add(training.trainerId);
        }
      });
    });

    const trainers =
      trainerIds.size > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: Array.from(trainerIds) } },
            select: { id: true, name: true, email: true, profileImage: true },
          })
        : [];
    const trainerMap = trainers.reduce(
      (acc, trainer) => {
        acc[trainer.id] = trainer;
        return acc;
      },
      {} as Record<string, (typeof trainers)[number]>,
    );

    const projectsWithDetails = await Promise.all(
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

        const trainingWithTrainer = project.trainingAssignments.map((training) => ({
          ...training,
          trainer: training.trainerId ? trainerMap[training.trainerId] ?? { id: training.trainerId } : null,
        }));

        return {
          ...project,
          screenings: screeningsWithScheduler,
          trainingAssignments: trainingWithTrainer,
        };
      }),
    );

    return {
      candidate: candidateInfo,
      projects: projectsWithDetails,
      subStatusCounts,
      totalAll,
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

    const countBaseWhere: typeof projectWhere = {
      candidateId,
      mainStatus: {
        name: {
          equals: 'processing',
          mode: 'insensitive',
        },
      },
    };
    if (search) {
      countBaseWhere.project = {
        title: {
          contains: search,
          mode: 'insensitive',
        },
      };
    }

    const subStatusGrouped = await this.prisma.candidateProjects.groupBy({
      by: ['subStatusId'],
      where: countBaseWhere,
      _count: { _all: true },
    });

    const subStatusCounts = subStatusGrouped.map((row) => ({
      subStatusId: row.subStatusId,
      count: row._count._all,
    }));

    const projectsForStepCounts = await this.prisma.candidateProjects.findMany({
      where: countBaseWhere,
      select: {
        processing: { select: { step: true } },
      },
    });

    const processingStepKeys = [
      'offer_letter',
      'documents_received',
      'hrd',
      'data_flow',
      'eligibility',
      'prometric',
      'council_registration',
      'document_attestation',
      'medical',
      'biometrics',
      'visa',
      'emigration',
      'ticket',
    ] as const;

    const stepCounts = processingStepKeys.reduce<Record<string, number>>((acc, key) => {
      acc[key] = projectsForStepCounts.filter((row) =>
        row.processing?.step?.toLowerCase().includes(key),
      ).length;
      return acc;
    }, {});

    const totalAll = projectsForStepCounts.length;

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
      subStatusCounts,
      stepCounts,
      totalAll,
      pagination: {
        total: totalProjects,
        page,
        limit,
        totalPages: Math.ceil(totalProjects / limit),
      },
    };
  }
}
