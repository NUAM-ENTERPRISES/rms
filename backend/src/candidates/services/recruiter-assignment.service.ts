import { Injectable, Logger } from '@nestjs/common';
import { LanguageProficiency, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CANDIDATE_STATUS } from '../../common/constants/statuses';
import { CANDIDATE_ASSIGNMENT_TYPE } from '../../common/constants/candidate-constants';
import { GetRecruiterCandidatesDto } from '../dto/get-recruiter-candidates.dto';
import { OutboxService } from '../../notifications/outbox.service';
import { RolesService } from '../../roles/roles.service';
import { ROLE_NAMES } from '../../common/constants/role-ids';
import { isAgentCandidateSource } from '../../common/constants/candidate-constants';
import { withProfileCompletion } from '../utils/profile-completion.util';

export type DirectAssignmentKind = 'recruiter' | 'agent_source';

/**
 * Agent-channel candidates: canonical/legacy source values OR any row linked to an Agent
 * (`agentId` set). Rows may keep `source: 'manual'` while still belonging to this pipeline.
 */
function prismaAgentChannelWhere(): Prisma.CandidateWhereInput {
  return {
    OR: [
      { source: 'agent' },
      { source: 'agents' },
      { agentId: { not: null } },
    ],
  };
}

export interface RecruiterInfo {
  id: string;
  name: string;
  email: string;
  mobileNumber?: string;
  countryCode?: string;
  candidateCount?: number;
}

@Injectable()
export class RecruiterAssignmentService {
  private readonly logger = new Logger(RecruiterAssignmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly rolesService: RolesService,
  ) { }

  /**
   * Get the best recruiter to assign to a candidate based on user role and workload
   * If the creator is a recruiter, assign the candidate to them directly
   * If the candidate source is agent, assign to the creator (Client Coordinator pipeline; no round-robin)
   * Otherwise, use language-aware assignment: state-driven target languages from
   * SystemConfig STATE_RECRUITMENT_LANGUAGES, match recruiter UserLanguage tiers
   * (PRIMARY > SECONDARY > TERTIARY), then least workload; if no config or no match,
   * fall back to plain least-workload among recruiters.
   */
  async getBestRecruiterForAssignment(
    candidateId: string,
    createdByUserId: string,
  ): Promise<
    RecruiterInfo & {
      isRoundRobin: boolean;
      directAssignmentKind?: DirectAssignmentKind;
    }
  > {
    // Get the user who created the candidate with their roles
    const creator = await this.prisma.user.findUnique({
      where: { id: createdByUserId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!creator) {
      throw new Error(`User with ID ${createdByUserId} not found`);
    }

    // Check if creator has the Recruiter role (case-insensitive)
    const recruiterRoleId = await this.rolesService.findIdByName(
      ROLE_NAMES.RECRUITER,
    );

    const isRecruiter = creator.userRoles.some(
      (ur) => 
        ur.roleId === recruiterRoleId || 
        ur.role?.name?.toLowerCase() === ROLE_NAMES.RECRUITER.toLowerCase()
    );

    const userRoleNames = creator.userRoles
      .map((ur) => ur.role?.name || 'Unknown')
      .join(', ');

    this.logger.log(
      `Candidate ${candidateId} assignment check: Created by ${creator.name} (${
        creator.email
      }). Roles: ${userRoleNames || 'NONE FOUND'}`,
    );

    if (isRecruiter) {
      this.logger.log(
        `✅ Creator ${creator.name} is a Recruiter - strictly assigning candidate directly to them (skipping round-robin)`,
      );
      return {
        id: creator.id,
        name: creator.name,
        email: creator.email,
        mobileNumber: creator.mobileNumber,
        countryCode: creator.countryCode,
        isRoundRobin: false,
        directAssignmentKind: 'recruiter',
      };
    }

    const candidateRow = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { source: true },
    });
    const source = candidateRow?.source;
    if (isAgentCandidateSource(source)) {
      this.logger.log(
        `✅ Candidate ${candidateId} is agent-sourced — assigning directly to creator ${creator.name} (skipping round-robin)`,
      );
      return {
        id: creator.id,
        name: creator.name,
        email: creator.email,
        mobileNumber: creator.mobileNumber,
        countryCode: creator.countryCode,
        isRoundRobin: false,
        directAssignmentKind: 'agent_source',
      };
    }

    // If not a recruiter and not agent-sourced, use language-aware round-robin when configured
    this.logger.log(
      `Creator ${creator.name} is NOT a Recruiter - using assignment (language-aware round-robin when configured)`,
    );
    const bestRecruiter = await this.getRecruiterWithLanguageAwareRoundRobin(
      candidateId,
    );
    return {
      ...bestRecruiter,
      isRoundRobin: true,
    };
  }

  private tierScore(p: LanguageProficiency): number {
    switch (p) {
      case LanguageProficiency.PRIMARY:
        return 3;
      case LanguageProficiency.SECONDARY:
        return 2;
      case LanguageProficiency.TERTIARY:
        return 1;
      default:
        return 0;
    }
  }

  private async getTargetLanguageCodesForCandidate(
    candidateId: string,
  ): Promise<string[]> {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: {
        addressState: { select: { code: true } },
      },
    });
    if (!candidate?.addressState?.code) {
      return [];
    }
    const row = await this.prisma.systemConfig.findUnique({
      where: { key: 'STATE_RECRUITMENT_LANGUAGES' },
    });
    if (!row?.value || typeof row.value !== 'object' || row.value === null) {
      return [];
    }
    const map = row.value as Record<string, unknown>;
    const key = candidate.addressState.code;
    const raw = map[key];
    if (!Array.isArray(raw)) {
      return [];
    }
    const codes = raw.filter(
      (x): x is string => typeof x === 'string' && x.length > 0,
    );
    if (codes.length === 0) {
      return [];
    }
    const valid = await this.prisma.language.findMany({
      where: { code: { in: codes }, isActive: true },
      select: { code: true },
    });
    const validSet = new Set(valid.map((v) => v.code));
    return codes.filter((c) => validSet.has(c));
  }

  /**
   * Prefer recruiters whose languages match candidate state config (SystemConfig),
   * then tier (PRIMARY > SECONDARY > TERTIARY), then least active assignments.
   * Fallback: least workload among all recruiters.
   */
  async getRecruiterWithLanguageAwareRoundRobin(
    candidateId: string,
  ): Promise<RecruiterInfo> {
    const targets = await this.getTargetLanguageCodesForCandidate(candidateId);
    if (targets.length === 0) {
      return this.getRecruiterWithLeastWorkload();
    }

    const recruiterRoleId = await this.rolesService.findIdByName(
      ROLE_NAMES.RECRUITER,
    );
    const recruiters = await this.prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            roleId: recruiterRoleId,
          },
        },
      },
      include: {
        candidateRecruiterAssignments: {
          where: {
            isActive: true,
          },
        },
        userLanguages: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    if (recruiters.length === 0) {
      throw new Error('No recruiters found in the system');
    }

    for (const lang of targets) {
      const matchRecruiters = recruiters.filter((r) =>
        r.userLanguages.some((ul) => ul.languageCode === lang),
      );
      if (matchRecruiters.length === 0) {
        continue;
      }
      let bestScore = -1;
      const bestAtScore: typeof matchRecruiters = [];
      for (const r of matchRecruiters) {
        const ul = r.userLanguages.find((x) => x.languageCode === lang)!;
        const sc = this.tierScore(ul.proficiency);
        if (sc > bestScore) {
          bestScore = sc;
          bestAtScore.length = 0;
          bestAtScore.push(r);
        } else if (sc === bestScore) {
          bestAtScore.push(r);
        }
      }
      bestAtScore.sort(
        (a, b) =>
          a.candidateRecruiterAssignments.length -
          b.candidateRecruiterAssignments.length,
      );
      const pick = bestAtScore[0]!;
      const info: RecruiterInfo = {
        id: pick.id,
        name: pick.name,
        email: pick.email,
        mobileNumber: pick.mobileNumber,
        countryCode: pick.countryCode,
        candidateCount: pick.candidateRecruiterAssignments.length,
      };
      this.logger.log(
        `Language-aware assignment: candidate=${candidateId} lang=${lang} recruiter=${pick.name} tierScore=${bestScore}`,
      );
      return info;
    }

    this.logger.log(
      `Language-aware assignment: no recruiter matched targets=[${targets.join(
        ',',
      )}] for candidate=${candidateId} — fallback workload`,
    );
    return this.getRecruiterWithLeastWorkload();
  }

  /**
   * Get recruiter with the least number of active candidates
   */
  async getRecruiterWithLeastWorkload(): Promise<RecruiterInfo> {
    const recruiterRoleId = await this.rolesService.findIdByName(
      ROLE_NAMES.RECRUITER,
    );

    // Get all recruiters with their active candidate count
    const recruiters = await this.prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            roleId: recruiterRoleId,
          },
        },
      },
      include: {
        candidateRecruiterAssignments: {
          where: {
            isActive: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    if (recruiters.length === 0) {
      throw new Error('No recruiters found in the system');
    }

    // Calculate workload for each recruiter
    const recruitersWithWorkload = recruiters.map((recruiter) => ({
      id: recruiter.id,
      name: recruiter.name,
      email: recruiter.email,
      mobileNumber: recruiter.mobileNumber,
      countryCode: recruiter.countryCode,
      candidateCount: recruiter.candidateRecruiterAssignments.length,
    }));

    // Sort by candidate count (ascending) and return the one with least workload
    const bestRecruiter = recruitersWithWorkload.sort(
      (a, b) => a.candidateCount - b.candidateCount,
    )[0];

    this.logger.log(
      `Assigned recruiter ${bestRecruiter.name} with ${bestRecruiter.candidateCount} active candidates`,
    );

    return bestRecruiter;
  }

  /**
   * Get CRE (Customer Relationship Executive) with the least workload
   */
  async getCREWithLeastWorkload(): Promise<RecruiterInfo> {
    const creRoleId = await this.rolesService.findIdByName(ROLE_NAMES.CRE);

    // Get all CREs with their active RNR candidate count
    const cres = await this.prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            roleId: creRoleId,
          },
        },
      },
      include: {
        candidateRecruiterAssignments: {
          where: {
            isActive: true,
            // candidate: {
            //   currentStatus: CANDIDATE_STATUS.RNR,
            // },
          },
        },
      },
    });

    if (cres.length === 0) {
      throw new Error('No CREs found in the system');
    }

    // Calculate RNR workload for each CRE
    const cresWithWorkload = cres.map((cre) => ({
      id: cre.id,
      name: cre.name,
      email: cre.email,
      candidateCount: cre.candidateRecruiterAssignments.length,
    }));

    // Sort by RNR candidate count (ascending) and return the one with least workload
    const bestCRE = cresWithWorkload.sort(
      (a, b) => a.candidateCount - b.candidateCount,
    )[0];

    this.logger.log(
      `Assigned CRE ${bestCRE.name} with ${bestCRE.candidateCount} active RNR candidates`,
    );

    return bestCRE;
  }

  /**
   * Assign recruiter to candidate with automatic assignment logic
   */
  async assignRecruiterToCandidate(
    candidateId: string,
    createdByUserId: string,
    reason?: string,
  ): Promise<RecruiterInfo> {
    const recruiter = await this.getBestRecruiterForAssignment(
      candidateId,
      createdByUserId,
    );

    const defaultAssignmentReason =
      reason ||
      (recruiter.isRoundRobin
        ? 'Automatic round-robin assignment on candidate creation'
        : recruiter.directAssignmentKind === 'agent_source'
          ? 'Direct assignment: agent-sourced candidate assigned to creator'
          : 'Direct recruiter-to-candidate assignment (Creator is Recruiter)');

    // Get current active recruiter before deactivating
    const currentAssignment = await this.prisma.candidateRecruiterAssignment.findFirst({
      where: {
        candidateId,
        isActive: true,
      },
      select: {
        recruiterId: true,
      },
    });

    // Preserve the original createdBy (the user who first brought this candidate in).
    // On the very first assignment there are no prior rows, so we fall back to createdByUserId.
    const originalAssignment = await this.prisma.candidateRecruiterAssignment.findFirst({
      where: { candidateId },
      orderBy: { assignedAt: 'asc' },
      select: { createdBy: true },
    });
    const preservedCreatedBy = originalAssignment?.createdBy ?? createdByUserId;

    // Deactivate any existing active assignments
    await this.prisma.candidateRecruiterAssignment.updateMany({
      where: {
        candidateId,
        isActive: true,
      },
      data: {
        isActive: false,
        unassignedAt: new Date(),
        unassignedBy: createdByUserId,
      },
    });

    // Create new assignment
    await this.prisma.candidateRecruiterAssignment.create({
      data: {
        candidateId,
        recruiterId: recruiter.id,
        assignedBy: createdByUserId,
        createdBy: preservedCreatedBy,
        reason: defaultAssignmentReason,
      },
    });

    // Notify about assignment
    await this.outboxService.publishCandidateRecruiterAssigned(
      candidateId,
      recruiter.id,
      createdByUserId,
      defaultAssignmentReason,
      currentAssignment?.recruiterId,
      createdByUserId,
      recruiter.isRoundRobin,
    );

    this.logger.log(
      `Assigned recruiter ${recruiter.name} to candidate ${candidateId} (Strategy: ${
        recruiter.isRoundRobin ? 'Round-Robin' : 'Direct Assignment'
      })`,
    );

    return recruiter;
  }

  /**
   * Assign CRE to candidate (for RNR status)
   * Note: This does NOT deactivate the primary recruiter; it adds a CRE as a concurrent handler.
   */
  async assignCREToCandidate(
    candidateId: string,
    assignedByUserId?: string,
    reason?: string,
  ): Promise<RecruiterInfo> {
    const cre = await this.getCREWithLeastWorkload();
    const assignerUserId = await this.resolveAssignerUserId(
      assignedByUserId,
      cre.id,
    );

    // Check if this CRE is already actively assigned to this candidate
    const existingCREAssignment = await this.prisma.candidateRecruiterAssignment.findFirst({
      where: {
        candidateId,
        recruiterId: cre.id,
        isActive: true,
      }
    });

    if (existingCREAssignment) {
      this.logger.log(`CRE ${cre.name} is already assigned to candidate ${candidateId}`);
      return cre;
    }

    // Preserve the original createdBy — the user who first created the candidate's assignment.
    // The CRE assignment is a concurrent handler row; it must NOT overwrite who created the candidate.
    const originalAssignment = await this.prisma.candidateRecruiterAssignment.findFirst({
      where: { candidateId },
      orderBy: { assignedAt: 'asc' },
      select: { createdBy: true },
    });
    const preservedCreatedBy =
      originalAssignment?.createdBy ??
      (assignedByUserId && assignedByUserId !== 'system' ? assignedByUserId : assignerUserId);

    // Create new CRE assignment WITHOUT deactivating others
    await this.prisma.candidateRecruiterAssignment.create({
      data: {
        candidateId,
        recruiterId: cre.id,
        assignedBy: assignerUserId,
        createdBy: preservedCreatedBy,
        reason: reason || 'Automatic CRE assignment for RNR status',
        assignmentType: CANDIDATE_ASSIGNMENT_TYPE.CRE_AUTO,
      },
    });

    // Notify about assignment - the current recruiter ID is still active, so we notify them
    const currentRecruiter = await this.prisma.candidateRecruiterAssignment.findFirst({
      where: {
        candidateId,
        isActive: true,
        assignmentType: { notIn: [CANDIDATE_ASSIGNMENT_TYPE.CRE_AUTO, CANDIDATE_ASSIGNMENT_TYPE.CRE_MANUAL] },
      },
      select: { recruiterId: true }
    });

    await this.outboxService.publishCandidateRecruiterAssigned(
      candidateId,
      cre.id,
      assignerUserId,
      reason,
      currentRecruiter?.recruiterId,
      preservedCreatedBy,
    );

    this.logger.log(
      `Assigned CRE ${cre.name} as handler to candidate ${candidateId} (Primary Recruiter remains active)`,
    );

    return cre;
  }

  private async resolveAssignerUserId(
    preferredUserId: string | undefined,
    fallbackUserId: string,
  ): Promise<string> {
    if (preferredUserId) {
      const userExists = await this.prisma.user.findUnique({
        where: { id: preferredUserId },
        select: { id: true },
      });

      if (userExists) {
        return preferredUserId;
      }

      this.logger.warn(
        `Assigner user ${preferredUserId} not found. Falling back to ${fallbackUserId}.`,
      );
    }

    return fallbackUserId;
  }

  /**
   * Get all RNR candidates that need CRE assignment (1+ minute in RNR status for testing)
   */
  async getRNRCandidatesNeedingCREAssignment(): Promise<Array<{
    candidateId: string;
    candidateName: string;
    minutesInRNR: number;
    currentRecruiterId?: string;
  }>> {
    const oneMinuteAgo = new Date();
    oneMinuteAgo.setMinutes(oneMinuteAgo.getMinutes() - 1);

    // First, resolve the RNR status record to get its ID
    const rnrStatus = await this.prisma.candidateStatus.findFirst({
      where: {
        statusName: {
          equals: CANDIDATE_STATUS.RNR,
          mode: 'insensitive',
        },
      },
    });

    if (!rnrStatus) {
      this.logger.error('RNR status not found in database');
      return [];
    }

    const rnrCandidates = await this.prisma.candidate.findMany({
      where: {
        currentStatusId: rnrStatus.id,
        updatedAt: {
          lte: oneMinuteAgo,
        },
      },
      include: {
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
          take: 1,
        },
      },
    });

    return rnrCandidates.map((candidate) => {
      const minutesInRNR = Math.floor(
        (Date.now() - candidate.updatedAt.getTime()) / (1000 * 60),
      );

      return {
        candidateId: candidate.id,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        minutesInRNR,
        currentRecruiterId: candidate.recruiterAssignments[0]?.recruiterId,
      };
    });
  }

  /**
   * Get all candidates assigned to a recruiter with pagination and filtering
   */
  async getRecruiterCandidates(
    recruiterId: string,
    dto: GetRecruiterCandidatesDto,
  ) {
    const { page = 1, limit = 10, status, search, roleCatalogId, source } = dto;
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      recruiterAssignments: {
        some: {
          recruiterId,
          isActive: true,
        },
      },
    };

    // Base assignment-only where used for dashboard counts (ignores search/status filters)
    const assignmentOnlyWhere = { ...whereClause };

    // Add status filter if provided
    if (status) {
      // Normalize incoming status (e.g., 'on_hold' -> 'On Hold') and try to resolve to a status record
      const normalized = status.replace(/_/g, ' ').trim();
      const titleCase = normalized
        .split(' ')
        .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
        .join(' ');

      const statusRecord = await this.prisma.candidateStatus.findFirst({
        where: {
          OR: [
            { statusName: { equals: status, mode: 'insensitive' } },
            { statusName: { equals: normalized, mode: 'insensitive' } },
            { statusName: { equals: titleCase, mode: 'insensitive' } },
          ],
        },
        select: { id: true, statusName: true },
      });

      if (statusRecord) {
        whereClause.currentStatusId = statusRecord.id;
      } else {
        // Fallback: try to match by status enum value directly (some DB rows may store lowercase)
        whereClause.currentStatus = { statusName: { equals: status, mode: 'insensitive' } };
      }
    }

    // Add search filter if provided
    if (search) {
      whereClause.OR = [
        {
          firstName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          lastName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          mobileNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }
    if (source && source !== 'all') {
      if (source === 'agent') {
        whereClause.AND = [
          ...(whereClause.AND ?? []),
          prismaAgentChannelWhere(),
        ];
      } else {
        whereClause.source = source;
      }
    }
    if (roleCatalogId && roleCatalogId !== 'all') {
      whereClause.workExperiences = {
        some: {
          roleCatalogId: roleCatalogId,
        },
      };
    }

    // Dashboard counts: when `source` is set, bucket stats on the same cohort as the listing
    // (respects channel; for `agent`, includes agentId-linked rows, not only source === 'agent').
    let assignmentWhereForDashboard: Prisma.CandidateWhereInput =
      assignmentOnlyWhere;
    if (source && source !== 'all') {
      assignmentWhereForDashboard =
        source === 'agent'
          ? { AND: [assignmentOnlyWhere, prismaAgentChannelWhere()] }
          : { AND: [assignmentOnlyWhere, { source }] };
    }

    // CreatedAt / Date range filtering (server-side)
    // Normalize incoming dateFrom/dateTo to full UTC calendar days so clients can pass
    // either date-only or datetime strings and still get "whole-day" semantics.
    if ((dto as any).dateFrom || (dto as any).dateTo) {
      const rawFrom = (dto as any).dateFrom;
      const rawTo = (dto as any).dateTo;

      let fromDt: Date | undefined;
      let toDt: Date | undefined;

      if (rawFrom) {
        const parsed = new Date(rawFrom);
        // use UTC components of the parsed value and normalize to start of that day (00:00:00.000 UTC)
        fromDt = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0, 0));
      }

      if (rawTo) {
        const parsed = new Date(rawTo);
        // normalize to end of that day (23:59:59.999 UTC)
        toDt = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 23, 59, 59, 999));
      }

      if (fromDt && toDt && fromDt.getTime() > toDt.getTime()) {
        const tmp = fromDt;
        fromDt = toDt;
        toDt = tmp;
      }

      whereClause.createdAt = {} as any;
      if (fromDt) whereClause.createdAt.gte = fromDt;
      if (toDt) whereClause.createdAt.lte = toDt;

      this.logger.log(`Applying createdAt filter for recruiter ${recruiterId}: rawFrom=${rawFrom || 'n/a'} rawTo=${rawTo || 'n/a'} normalizedFrom=${fromDt?.toISOString() || 'n/a'} normalizedTo=${toDt?.toISOString() || 'n/a'}`);
    }

    // Get total count (for the listing - respects search/status/search filters)
    const totalCount = await this.prisma.candidate.count({
      where: whereClause,
    });

    // Use status IDs (more reliable) to compute counts
    // Use case-insensitive lookup for status names to handle different casings in DB
    const untouchedStatus = await this.prisma.candidateStatus.findFirst({
      where: {
        statusName: {
          equals: CANDIDATE_STATUS.UNTOUCHED,
          mode: 'insensitive',
        },
      },
      select: { id: true, statusName: true },
    });

    const rnrStatus = await this.prisma.candidateStatus.findFirst({
      where: {
        statusName: {
          equals: CANDIDATE_STATUS.RNR,
          mode: 'insensitive',
        },
      },
      select: { id: true, statusName: true },
    });

    this.logger.log(
      `Resolved statuses => untouched: ${untouchedStatus?.statusName || 'NOT_FOUND'}(${untouchedStatus?.id || 'n/a'}), rnr: ${rnrStatus?.statusName || 'NOT_FOUND'}(${rnrStatus?.id || 'n/a'})`,
    );

    // Retrieve assigned candidates' currentStatusId and compute counts in-memory
    const assignedCandidates = await this.prisma.candidate.findMany({
      where: assignmentWhereForDashboard,
      select: {
        id: true,
        currentStatusId: true,
        recruiterAssignments: {
          where: { isActive: true },
          select: { assignmentType: true }
        }
      },
    });

    const onHoldStatus = await this.prisma.candidateStatus.findFirst({
      where: {
        statusName: {
          equals: CANDIDATE_STATUS.ON_HOLD,
          mode: 'insensitive',
        },
      },
      select: { id: true, statusName: true },
    });

    const interestedStatus = await this.prisma.candidateStatus.findFirst({
      where: { statusName: { equals: CANDIDATE_STATUS.INTERESTED, mode: 'insensitive' } },
      select: { id: true, statusName: true },
    });

    const notInterestedStatus = await this.prisma.candidateStatus.findFirst({
      where: { statusName: { equals: CANDIDATE_STATUS.NOT_INTERESTED, mode: 'insensitive' } },
      select: { id: true, statusName: true },
    });

    const otherEnquiryStatus = await this.prisma.candidateStatus.findFirst({
      where: { statusName: { equals: CANDIDATE_STATUS.OTHER_ENQUIRY, mode: 'insensitive' } },
      select: { id: true, statusName: true },
    });

    const qualifiedStatus = await this.prisma.candidateStatus.findFirst({
      where: { statusName: { equals: CANDIDATE_STATUS.QUALIFIED, mode: 'insensitive' } },
      select: { id: true, statusName: true },
    });

    const futureStatus = await this.prisma.candidateStatus.findFirst({
      where: { statusName: { equals: CANDIDATE_STATUS.FUTURE, mode: 'insensitive' } },
      select: { id: true, statusName: true },
    });

    // 'deployed' status lookup
    const deployedStatus = await this.prisma.candidateStatus.findFirst({
      where: { statusName: { equals: CANDIDATE_STATUS.DEPLOYED, mode: 'insensitive' } },
      select: { id: true, statusName: true },
    });

    const untouchedId = untouchedStatus?.id ?? null;
    const rnrId = rnrStatus?.id ?? null;
    const onHoldId = onHoldStatus?.id ?? null;

    const interestedId = interestedStatus?.id ?? null;
    const qualifiedId = qualifiedStatus?.id ?? null;
    const futureId = futureStatus?.id ?? null;
    const deployedId = deployedStatus?.id ?? null;
    const notInterestedId = notInterestedStatus?.id ?? null;
    const otherEnquiryId = otherEnquiryStatus?.id ?? null;

    const countsMap = assignedCandidates.reduce(
      (acc, c) => {
        const isHandledByCRE = c.recruiterAssignments.some(
          (a) => a.assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_AUTO || a.assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_MANUAL
        );

        acc.totalAssigned += 1;
        if (isHandledByCRE) acc.handledByCRE += 1;

        if (c.currentStatusId === untouchedId) acc.untouched += 1;
        if (c.currentStatusId === rnrId) {
          acc.rnr += 1;
          if (isHandledByCRE) acc.rnrHandledByCRE += 1;
        }

        if (c.currentStatusId === onHoldId) acc.onHold += 1;
        if (c.currentStatusId === interestedId) acc.interested += 1;
        if (c.currentStatusId === notInterestedId) acc.notInterested += 1;
        if (c.currentStatusId === otherEnquiryId) acc.otherEnquiry += 1;
        if (c.currentStatusId === qualifiedId) acc.qualified += 1;
        if (c.currentStatusId === futureId) acc.future += 1;
        if (c.currentStatusId === deployedId) acc.working += 1;
        return acc;
      },
      {
        totalAssigned: 0,
        handledByCRE: 0,
        untouched: 0,
        rnr: 0,
        rnrHandledByCRE: 0,
        onHold: 0,
        interested: 0,
        notInterested: 0,
        otherEnquiry: 0,
        qualified: 0,
        future: 0,
        working: 0,
      },
    );

    this.logger.log(
      `Recruiter ${recruiterId} counts => totalAssigned: ${countsMap.totalAssigned}, untouched: ${countsMap.untouched}, rnr: ${countsMap.rnr}, onHold: ${countsMap.onHold}, notInterested: ${countsMap.notInterested}, otherEnquiry: ${countsMap.otherEnquiry}`,
    );

    // Get candidates
    const candidates = await this.prisma.candidate.findMany({
      where: whereClause,
      skip,
      take: limit,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        currentStatus: {
          select: {
            id: true,
            statusName: true,
          },
        },
        qualifications: {
          include: {
            qualification: true,
          },
        },
        workExperiences: true,
        // Include ALL active recruiter assignments to detect CRE handling and recruiter info
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
            assignedByUser: {
              select: {
                id: true,
                name: true,
                email: true,
                mobileNumber: true,
                countryCode: true,
              },
            },
            createdByUser: {
              select: {
                id: true,
                name: true,
                email: true,
                mobileNumber: true,
                countryCode: true,
              },
            },
          },
        },
        documents: {
          where: { isDeleted: false },
          select: { docType: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedCandidates = candidates.map((candidate) => {
      // Find the specific CRE assignment if it exists
      const creAssignment = candidate.recruiterAssignments.find(
        (a) => a.assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_AUTO || a.assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_MANUAL
      );

      // Check if candidate is handled by a CRE
      const isHandledByCRE = !!creAssignment;

      // Extract the specific recruiter assignment for the logged-in recruiter
      const recruiterAssignment = candidate.recruiterAssignments.find(
        (a) => a.recruiterId === recruiterId
      );

      // Check if this recruiter assignment was handed back from a CRE
      const isCREReassigned = recruiterAssignment?.assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_REASSIGNED;

      const merged = withProfileCompletion(candidate as any);

      return {
        ...merged,
        isHandledByCRE,
        isCREReassigned,
        creHandler: creAssignment ? {
          id: creAssignment.recruiter.id,
          name: creAssignment.recruiter.name,
          email: creAssignment.recruiter.email,
          assignedAt: creAssignment.assignedAt,
          assignmentType: creAssignment.assignmentType,
        } : null,
        // Match the legacy expected format where recruiterAssignments contains only the primary one
        // or just return the recruiter directly if the UI expects it
        recruiter: recruiterAssignment?.recruiter || null,
        candidateCreatedBy:
          recruiterAssignment?.createdByUser || recruiterAssignment?.assignedByUser || null,
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: formattedCandidates,
      counts: {
        totalAssigned: countsMap.totalAssigned,
        handledByCRE: countsMap.handledByCRE,
        untouched: countsMap.untouched,
        rnr: countsMap.rnr,
        rnrHandledByCRE: countsMap.rnrHandledByCRE,
        onHold: countsMap.onHold,
        interested: countsMap.interested,
        notInterested: countsMap.notInterested,
        otherEnquiry: countsMap.otherEnquiry,
        qualified: countsMap.qualified,
        future: countsMap.future,
        working: countsMap.working,
      },
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }
}
