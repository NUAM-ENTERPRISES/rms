import { Injectable, Logger } from '@nestjs/common';
import { LanguageProficiency, Prisma, ProfessionSector } from '@prisma/client';
import { ACTIVE_USER_ACCOUNT_WHERE } from '../../users/user-account-status.filter';
import { PrismaService } from '../../database/prisma.service';
import {
  professionCoverageWhere,
  RecruiterProfessionCoverage,
  recruiterCoversProfession,
  sectorCoverageWhere,
} from '../../users/profession-coverage.util';
import { CANDIDATE_STATUS } from '../../common/constants/statuses';
import { CANDIDATE_ASSIGNMENT_TYPE } from '../../common/constants/candidate-constants';
import { GetRecruiterCandidatesDto } from '../dto/get-recruiter-candidates.dto';
import { CandidateListFilterService } from './candidate-list-filter.service';
import { OutboxService } from '../../notifications/outbox.service';
import { RolesService } from '../../roles/roles.service';
import { ROLE_NAMES, RECRUITER_ROLE_NAMES, isRecruiterRoleName } from '../../common/constants/role-ids';
import { isAgentCandidateSource } from '../../common/constants/candidate-constants';
import { withProfileCompletion } from '../utils/profile-completion.util';
import {
  resolveCreHandoffNote,
  resolveCreHandoffStatus,
} from '../utils/cre-handoff.util';
import { calculateCareerGaps } from '../utils/employment-timeline.util';

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
    private readonly candidateListFilterService: CandidateListFilterService,
  ) { }

  /**
   * Get the best recruiter to assign to a candidate based on user role and workload
   * If the creator is a recruiter, assign the candidate to them directly
   * If the candidate source is agent, assign to the creator (Agent Coordinator pipeline; no round-robin)
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
        userProfessionScopes: true,
      },
    });

    if (!creator) {
      throw new Error(`User with ID ${createdByUserId} not found`);
    }

    // Check if creator has the Recruiter role (case-insensitive)
    const recruiterRoleIds = await this.rolesService.findRecruiterRoleIds();

    const isRecruiter = creator.userRoles.some(
      (ur) =>
        recruiterRoleIds.includes(ur.roleId) ||
        isRecruiterRoleName(ur.role?.name),
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
      const candidateProfession =
        await this.getCandidateProfession(candidateId);
      const hasProfessionCoverage =
        candidateProfession &&
        recruiterCoversProfession(
          {
            handlesAllProfessions: creator.handlesAllProfessions,
            recruiterSectorScope: creator.recruiterSectorScope,
            professionTypeIds: creator.userProfessionScopes.map(
              (scope) => scope.professionTypeId,
            ),
          },
          candidateProfession,
        );

      if (hasProfessionCoverage) {
        this.logger.log(
          `✅ Creator ${creator.name} is a Recruiter with matching profession coverage - assigning candidate directly (skipping round-robin)`,
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

      this.logger.log(
        `Creator ${creator.name} is a Recruiter but lacks profession coverage for this candidate — using round-robin`,
      );
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

  private async getCandidateProfession(
    candidateId: string,
  ): Promise<{
    id: string | null;
    sector: ProfessionSector | null;
    focusesAllProfessions: boolean;
  } | null> {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: {
        professionTypeId: true,
        focusesAllProfessions: true,
        professionSector: true,
        professionType: { select: { sector: true } },
      },
    });
    if (!candidate) {
      return null;
    }
    if (candidate.focusesAllProfessions) {
      return {
        id: null,
        sector: candidate.professionSector ?? null,
        focusesAllProfessions: true,
      };
    }
    if (!candidate.professionTypeId) {
      return null;
    }
    return {
      id: candidate.professionTypeId,
      sector:
        candidate.professionType?.sector ?? candidate.professionSector ?? null,
      focusesAllProfessions: false,
    };
  }

  private coverageWhereFromProfession(
    profession: {
      id: string | null;
      sector: ProfessionSector | null;
      focusesAllProfessions: boolean;
    } | null,
  ): Prisma.UserWhereInput {
    if (!profession) {
      return {};
    }
    if (
      profession.focusesAllProfessions &&
      (profession.sector === ProfessionSector.HEALTHCARE ||
        profession.sector === ProfessionSector.NON_HEALTH_CARE)
    ) {
      return sectorCoverageWhere(profession.sector);
    }
    if (profession.id) {
      return professionCoverageWhere(profession.id, profession.sector);
    }
    return {};
  }

  private async professionScopeWhere(
    professionTypeId: string | null,
  ): Promise<Prisma.UserWhereInput> {
    if (!professionTypeId) {
      return {};
    }
    const type = await this.prisma.professionType.findUnique({
      where: { id: professionTypeId },
      select: { sector: true },
    });
    return professionCoverageWhere(professionTypeId, type?.sector ?? null);
  }

  private async recruiterRoleWhere(): Promise<Prisma.UserWhereInput> {
    const recruiterRoleIds = await this.rolesService.findRecruiterRoleIds();
    return {
      userRoles: {
        some: {
          OR: [
            ...(recruiterRoleIds.length > 0
              ? [{ roleId: { in: recruiterRoleIds } }]
              : []),
            {
              role: {
                name: { in: [...RECRUITER_ROLE_NAMES] },
              },
            },
          ],
        },
      },
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
    const profession = await this.getCandidateProfession(candidateId);
    const targets = await this.getTargetLanguageCodesForCandidate(candidateId);
    if (targets.length === 0) {
      return this.getRecruiterWithLeastWorkload(profession?.id ?? null, {
        focusesAllProfessions: profession?.focusesAllProfessions,
        sector: profession?.sector,
      });
    }

    const professionWhere = this.coverageWhereFromProfession(profession);
    const recruiters = await this.prisma.user.findMany({
      where: {
        ...ACTIVE_USER_ACCOUNT_WHERE,
        ...professionWhere,
        ...(await this.recruiterRoleWhere()),
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
      throw new Error(
        profession?.id || profession?.focusesAllProfessions
          ? 'No recruiters available for this profession type'
          : 'No active recruiters found in the system',
      );
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
    return this.getRecruiterWithLeastWorkload(profession?.id ?? null, {
      focusesAllProfessions: profession?.focusesAllProfessions,
      sector: profession?.sector,
    });
  }

  /**
   * Get recruiter with the least number of active candidates
   */
  async getRecruiterWithLeastWorkload(
    professionTypeId?: string | null,
    options?: {
      focusesAllProfessions?: boolean;
      sector?: ProfessionSector | null;
    },
  ): Promise<RecruiterInfo> {
    const professionWhere =
      options?.focusesAllProfessions &&
      (options.sector === ProfessionSector.HEALTHCARE ||
        options.sector === ProfessionSector.NON_HEALTH_CARE)
        ? sectorCoverageWhere(options.sector)
        : await this.professionScopeWhere(professionTypeId ?? null);
    const recruiters = await this.prisma.user.findMany({
      where: {
        ...ACTIVE_USER_ACCOUNT_WHERE,
        ...professionWhere,
        ...(await this.recruiterRoleWhere()),
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
      throw new Error(
        professionTypeId || options?.focusesAllProfessions
          ? 'No recruiters available for this profession type'
          : 'No active recruiters found in the system',
      );
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
    const creRoleId = await this.rolesService.findIdByName(ROLE_NAMES.OPERATIONS);

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

    await this.persistRecruiterAssignment({
      candidateId,
      recruiter,
      assignedByUserId: createdByUserId,
      reason: defaultAssignmentReason,
      isRoundRobin: recruiter.isRoundRobin,
    });

    return recruiter;
  }

  /**
   * Assign a recruiter to an unassigned candidate using language/workload
   * round-robin only (never assign to the acting user just because they are a Recruiter).
   */
  async assignRecruiterToUnassignedCandidate(
    candidateId: string,
    assignedByUserId: string,
    preferredRecruiterId?: string,
  ): Promise<RecruiterInfo | null> {
    const currentAssignment =
      await this.prisma.candidateRecruiterAssignment.findFirst({
        where: {
          candidateId,
          isActive: true,
        },
        select: { recruiterId: true },
      });
    if (currentAssignment) {
      return null;
    }

    let recruiter: RecruiterInfo;
    try {
      recruiter =
        await this.getRecruiterWithLanguageAwareRoundRobin(candidateId);
    } catch (error) {
      if (!preferredRecruiterId) {
        throw error;
      }
      const preferred = await this.prisma.user.findUnique({
        where: { id: preferredRecruiterId },
        select: {
          id: true,
          name: true,
          email: true,
          mobileNumber: true,
          countryCode: true,
        },
      });
      if (!preferred) {
        throw error;
      }
      this.logger.warn(
        `Round-robin found no pool for candidate ${candidateId}; assigning preferred recruiter ${preferred.name}`,
      );
      recruiter = preferred;
    }

    await this.persistRecruiterAssignment({
      candidateId,
      recruiter,
      assignedByUserId,
      reason:
        'Automatic backfill: unassigned candidate assigned after recruiter became available',
      isRoundRobin: true,
      assignmentType: 'auto_backfill',
    });

    return recruiter;
  }

  /**
   * Assign leftover unassigned candidates after a Recruiter is created or
   * their profession coverage expands. Uses least-workload round-robin among
   * all currently eligible recruiters (not only the new user).
   */
  async backfillUnassignedRecruiterAssignments(options?: {
    recruiterId?: string;
    assignedByUserId?: string;
  }): Promise<{ assigned: number; skipped: number; failed: number }> {
    const assignedByUserId =
      options?.assignedByUserId ?? options?.recruiterId;
    if (!assignedByUserId) {
      this.logger.warn(
        'Skipping unassigned recruiter backfill: no assignedByUserId',
      );
      return { assigned: 0, skipped: 0, failed: 0 };
    }

    const candidates = await this.prisma.candidate.findMany({
      where: {
        recruiterAssignments: {
          none: { isActive: true },
        },
        NOT: prismaAgentChannelWhere(),
      },
      select: {
        id: true,
        professionTypeId: true,
        focusesAllProfessions: true,
        professionSector: true,
        professionType: { select: { sector: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    let coverageFilter: RecruiterProfessionCoverage | null = null;
    if (options?.recruiterId) {
      const recruiter = await this.prisma.user.findUnique({
        where: { id: options.recruiterId },
        select: {
          handlesAllProfessions: true,
          recruiterSectorScope: true,
          userProfessionScopes: { select: { professionTypeId: true } },
        },
      });
      if (!recruiter) {
        this.logger.warn(
          `Skipping unassigned recruiter backfill: recruiter ${options.recruiterId} not found`,
        );
        return { assigned: 0, skipped: 0, failed: 0 };
      }
      coverageFilter = {
        handlesAllProfessions: recruiter.handlesAllProfessions,
        recruiterSectorScope: recruiter.recruiterSectorScope,
        professionTypeIds: recruiter.userProfessionScopes.map(
          (scope) => scope.professionTypeId,
        ),
      };
    }

    const recruiterCoverage = coverageFilter;
    const eligible = recruiterCoverage
      ? candidates.filter((candidate) =>
          recruiterCoversProfession(
            recruiterCoverage,
            this.professionFromCandidateRow(candidate),
          ),
        )
      : candidates;

    let assigned = 0;
    let skipped = 0;
    let failed = 0;

    for (const candidate of eligible) {
      try {
        const result = await this.assignRecruiterToUnassignedCandidate(
          candidate.id,
          assignedByUserId,
          options?.recruiterId,
        );
        if (result) {
          assigned += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        failed += 1;
        this.logger.error(
          `Failed to backfill recruiter assignment for candidate ${candidate.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    this.logger.log(
      `Unassigned recruiter backfill complete: assigned=${assigned} skipped=${skipped} failed=${failed}`,
    );

    return { assigned, skipped, failed };
  }

  private professionFromCandidateRow(candidate: {
    professionTypeId: string | null;
    focusesAllProfessions: boolean;
    professionSector: ProfessionSector | null;
    professionType: { sector: ProfessionSector | null } | null;
  }): {
    id: string | null;
    sector: ProfessionSector | null;
  } {
    if (candidate.focusesAllProfessions) {
      return {
        id: null,
        sector: candidate.professionSector ?? null,
      };
    }
    return {
      id: candidate.professionTypeId,
      sector:
        candidate.professionType?.sector ?? candidate.professionSector ?? null,
    };
  }

  private async persistRecruiterAssignment(params: {
    candidateId: string;
    recruiter: RecruiterInfo;
    assignedByUserId: string;
    reason: string;
    isRoundRobin: boolean;
    assignmentType?: string;
  }): Promise<void> {
    const {
      candidateId,
      recruiter,
      assignedByUserId,
      reason,
      isRoundRobin,
      assignmentType,
    } = params;

    const currentAssignment =
      await this.prisma.candidateRecruiterAssignment.findFirst({
        where: {
          candidateId,
          isActive: true,
        },
        select: {
          recruiterId: true,
        },
      });

    const originalAssignment =
      await this.prisma.candidateRecruiterAssignment.findFirst({
        where: { candidateId },
        orderBy: { assignedAt: 'asc' },
        select: { createdBy: true },
      });
    const preservedCreatedBy =
      originalAssignment?.createdBy ?? assignedByUserId;

    await this.prisma.candidateRecruiterAssignment.updateMany({
      where: {
        candidateId,
        isActive: true,
      },
      data: {
        isActive: false,
        unassignedAt: new Date(),
        unassignedBy: assignedByUserId,
      },
    });

    await this.prisma.candidateRecruiterAssignment.create({
      data: {
        candidateId,
        recruiterId: recruiter.id,
        assignedBy: assignedByUserId,
        createdBy: preservedCreatedBy,
        reason,
        ...(assignmentType ? { assignmentType } : {}),
      },
    });

    await this.outboxService.publishCandidateRecruiterAssigned(
      candidateId,
      recruiter.id,
      assignedByUserId,
      reason,
      currentAssignment?.recruiterId,
      assignedByUserId,
      isRoundRobin,
    );

    this.logger.log(
      `Assigned recruiter ${recruiter.name} to candidate ${candidateId} (Strategy: ${
        isRoundRobin ? 'Round-Robin' : 'Direct Assignment'
      })`,
    );
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
    const { page = 1, limit = 10, status, search, source, sources } = dto;
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: Prisma.CandidateWhereInput = {
      recruiterAssignments: {
        some: {
          recruiterId,
          isActive: true,
        },
      },
    };

    // Base assignment-only where used for dashboard counts (ignores search/status filters)
    const assignmentOnlyWhere: Prisma.CandidateWhereInput = { ...whereClause };

    await this.candidateListFilterService.applyCrmStatusNameFilter(
      whereClause,
      status,
      dto.currentStatus,
    );

    this.candidateListFilterService.applySearchFilter(whereClause, search, {
      includeQualifications: true,
    });
    this.candidateListFilterService.applyCreatedAtFilter(whereClause, dto);
    this.candidateListFilterService.applyAdvancedListFilters(whereClause, dto, {
      skipSource: true,
    });
    this.candidateListFilterService.applySourceFilter(
      whereClause,
      { source, sources },
      prismaAgentChannelWhere(),
    );

    // Dashboard counts: when source filter is set, bucket stats on the same cohort as the listing
    let assignmentWhereForDashboard: Prisma.CandidateWhereInput =
      assignmentOnlyWhere;
    const dashboardSource =
      sources && sources.length === 1
        ? sources[0]
        : sources && sources.length > 0
          ? undefined
          : source;
    if (dashboardSource && dashboardSource !== 'all') {
      assignmentWhereForDashboard =
        dashboardSource === 'agent'
          ? { AND: [assignmentOnlyWhere, prismaAgentChannelWhere()] }
          : { AND: [assignmentOnlyWhere, { source: dashboardSource }] };
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

    const callBackStatus = await this.prisma.candidateStatus.findFirst({
      where: {
        statusName: {
          equals: 'Call Back',
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
          select: { assignmentType: true, recruiterId: true },
        },
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

    const notEligibleStatus = await this.prisma.candidateStatus.findFirst({
      where: {
        OR: [
          { statusName: { equals: CANDIDATE_STATUS.NOT_ELIGIBLE, mode: 'insensitive' } },
          { statusName: { equals: 'Not Eligible', mode: 'insensitive' } },
        ],
      },
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
    const callBackId = callBackStatus?.id ?? null;
    const onHoldId = onHoldStatus?.id ?? null;

    const interestedId = interestedStatus?.id ?? null;
    const qualifiedId = qualifiedStatus?.id ?? null;
    const futureId = futureStatus?.id ?? null;
    const deployedId = deployedStatus?.id ?? null;
    const notInterestedId = notInterestedStatus?.id ?? null;
    const otherEnquiryId = otherEnquiryStatus?.id ?? null;
    const notEligibleId = notEligibleStatus?.id ?? null;

    const countsMap = assignedCandidates.reduce(
      (acc, c) => {
        const isHandledByCRE = c.recruiterAssignments.some(
          (a) => a.assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_AUTO || a.assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_MANUAL
        );

        const isCreReassignedForRecruiter = c.recruiterAssignments.some(
          (a) =>
            a.recruiterId === recruiterId &&
            a.assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_REASSIGNED,
        );

        // CRE handoff status is internal; recruiters always bucket these as untouched
        const effectiveStatusId =
          isCreReassignedForRecruiter && untouchedId
            ? untouchedId
            : c.currentStatusId;

        acc.totalAssigned += 1;
        if (isHandledByCRE) acc.handledByCRE += 1;

        if (effectiveStatusId === untouchedId) acc.untouched += 1;
        if (!isCreReassignedForRecruiter && c.currentStatusId === rnrId) {
          acc.rnr += 1;
          if (isHandledByCRE) acc.rnrHandledByCRE += 1;
        }
        if (!isCreReassignedForRecruiter && c.currentStatusId === callBackId) {
          acc.callBack += 1;
        }

        if (!isCreReassignedForRecruiter && c.currentStatusId === onHoldId) {
          acc.onHold += 1;
        }
        if (!isCreReassignedForRecruiter && c.currentStatusId === interestedId) {
          acc.interested += 1;
        }
        if (!isCreReassignedForRecruiter && c.currentStatusId === notInterestedId) {
          acc.notInterested += 1;
        }
        if (!isCreReassignedForRecruiter && c.currentStatusId === notEligibleId) {
          acc.notEligible += 1;
        }
        if (!isCreReassignedForRecruiter && c.currentStatusId === otherEnquiryId) {
          acc.otherEnquiry += 1;
        }
        if (!isCreReassignedForRecruiter && c.currentStatusId === qualifiedId) {
          acc.qualified += 1;
        }
        if (!isCreReassignedForRecruiter && c.currentStatusId === futureId) {
          acc.future += 1;
        }
        if (!isCreReassignedForRecruiter && c.currentStatusId === deployedId) {
          acc.working += 1;
        }
        return acc;
      },
      {
        totalAssigned: 0,
        handledByCRE: 0,
        untouched: 0,
        rnr: 0,
        rnrHandledByCRE: 0,
        callBack: 0,
        onHold: 0,
        interested: 0,
        notInterested: 0,
        notEligible: 0,
        otherEnquiry: 0,
        qualified: 0,
        future: 0,
        working: 0,
      },
    );

    this.logger.log(
      `Recruiter ${recruiterId} counts => totalAssigned: ${countsMap.totalAssigned}, untouched: ${countsMap.untouched}, rnr: ${countsMap.rnr}, onHold: ${countsMap.onHold}, notInterested: ${countsMap.notInterested}, notEligible: ${countsMap.notEligible}, otherEnquiry: ${countsMap.otherEnquiry}`,
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
            creStatus: {
              select: { id: true, statusName: true },
            },
          },
        },
        documents: {
          where: { isDeleted: false },
          select: { docType: true },
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

      const creReassignedAssignment = candidate.recruiterAssignments.find(
        (a) => a.assignmentType === CANDIDATE_ASSIGNMENT_TYPE.CRE_REASSIGNED,
      );
      const isCREReassigned = !!creReassignedAssignment;
      const statusHistories = candidate.statusHistories ?? [];

      const { statusHistories: _omitHistories, ...candidateWithoutHistories } =
        candidate;
      const merged = withProfileCompletion(candidateWithoutHistories as any);

      return {
        ...merged,
        careerGapAnalysis: calculateCareerGaps(
          candidate.workExperiences ?? [],
          candidate.qualifications ?? [],
        ),
        currentStatus: merged.currentStatus,
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
        callBack: countsMap.callBack,
        onHold: countsMap.onHold,
        interested: countsMap.interested,
        notInterested: countsMap.notInterested,
        notEligible: countsMap.notEligible,
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
