import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { withActiveAccountStatus } from '../../users/user-account-status.filter';
import {
  computePerformanceScore,
  DEPLOYED_CRM_STATUS_NAMES,
  getMonthPeriodBounds,
  getYearPeriodBounds,
  PERFORMANCE_PROJECT_SUB_STATUSES,
  PERFORMANCE_STAGE_ACTIVITY_LABELS,
  PerformanceStageCounts,
  POSITIVE_CRM_STATUS_NAMES,
  resolvePerformanceRating,
} from './recruiter-performance-rating.constants';

@Injectable()
export class RecruiterAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * API 1: Recruiter Activity Breakdown
   * Returns counts for: Registered (nominated), Document Verified, Interview Scheduled,
   * Interview Passed, and Hired candidates for a given recruiter.
   */
  async getActivityBreakdown(recruiterId: string, year?: number) {
    const currentYear = year || new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    // Get the recruiter info
    const recruiter = await this.prisma.user.findUnique({
      where: { id: recruiterId },
      select: { id: true, name: true, email: true },
    });

    if (!recruiter) {
      return {
        success: false,
        data: null,
        message: 'Recruiter not found',
      };
    }

    // Get all candidate-project mappings assigned to this recruiter within the year
    const candidateProjects = await this.prisma.candidateProjects.findMany({
      where: {
        recruiterId,
        assignedAt: {
          gte: yearStart,
          lte: yearEnd,
        },
      },
      include: {
        currentProjectStatus: {
          select: { statusName: true },
        },
      },
    });

    // Count nominated candidates (registered = candidates nominated by this recruiter)
    const nominated = candidateProjects.length;

    // Count documents verified
    const documentVerified = candidateProjects.filter(
      (cp) => {
        const status = cp.currentProjectStatus?.statusName;
        return status && ![
          'nominated',
          'pending_documents',
          'documents_submitted',
          'verification_in_progress',
        ].includes(status);
      },
    ).length;

    // Count interview scheduled
    const interviewScheduled = candidateProjects.filter(
      (cp) => {
        const status = cp.currentProjectStatus?.statusName;
        return (
          status === 'interview_scheduled' ||
          status === 'interview_completed' ||
          status === 'interview_passed' ||
          status === 'selected' ||
          status === 'processing' ||
          status === 'hired'
        );
      },
    ).length;

    // Count interview passed
    const interviewPassed = candidateProjects.filter(
      (cp) => {
        const status = cp.currentProjectStatus?.statusName;
        return (
          status === 'interview_passed' ||
          status === 'selected' ||
          status === 'processing' ||
          status === 'hired'
        );
      },
    ).length;

    // Count hired
    const hired = candidateProjects.filter(
      (cp) => cp.currentProjectStatus?.statusName === 'hired',
    ).length;

    // Count total placements (hired)
    const placements = hired;

    return {
      success: true,
      data: {
        recruiter: {
          id: recruiter.id,
          name: recruiter.name,
          email: recruiter.email,
        },
        placements,
        activityBreakdown: [
          { activity: 'Registered', value: nominated },
          { activity: 'Document Verified', value: documentVerified },
          { activity: 'Interview Scheduled', value: interviewScheduled },
          { activity: 'Interview Passed', value: interviewPassed },
          { activity: 'Hired', value: hired },
        ],
      },
      message: 'Recruiter activity breakdown retrieved successfully',
    };
  }

  /**
   * API 2: Recruiter Follow-up Status Overview
   * Returns distribution of candidates by follow-up status (candidate global status)
   * for a given recruiter.
   */
  async getFollowupStatus(recruiterId: string, year?: number) {
    const currentYear = year || new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    // Get the recruiter info
    const recruiter = await this.prisma.user.findUnique({
      where: { id: recruiterId },
      select: { id: true, name: true, email: true },
    });

    if (!recruiter) {
      return {
        success: false,
        data: null,
        message: 'Recruiter not found',
      };
    }

    // Get all candidate assignments for this recruiter
    const candidateAssignments =
      await this.prisma.candidateRecruiterAssignment.findMany({
        where: {
          recruiterId,
          isActive: true,
        },
        include: {
          candidate: {
            select: {
              id: true,
              currentStatus: {
                select: { statusName: true },
              },
            },
          },
        },
      });

    // Get all follow-up statuses from DB to use actual names
    const allStatuses = await this.prisma.candidateStatus.findMany({
      select: { id: true, statusName: true },
    });

    // Initialize counts using actual DB status names
    const statusCounts: Record<string, number> = {};
    allStatuses.forEach((s) => {
      statusCounts[s.statusName] = 0;
    });

    candidateAssignments.forEach((assignment) => {
      const statusName =
        assignment.candidate.currentStatus?.statusName || 'Untouched';
      if (statusCounts.hasOwnProperty(statusName)) {
        statusCounts[statusName]++;
      } else {
        // Fallback: try to match case-insensitively
        const matched = Object.keys(statusCounts).find(
          (k) => k.toLowerCase() === statusName.toLowerCase(),
        );
        if (matched) {
          statusCounts[matched]++;
        }
      }
    });

    const followupStatuses = Object.entries(statusCounts).map(
      ([statusName, count]) => ({
        status: statusName,
        count,
      }),
    );

    const total = followupStatuses.reduce((sum, s) => sum + s.count, 0);

    return {
      success: true,
      data: {
        recruiter: {
          id: recruiter.id,
          name: recruiter.name,
          email: recruiter.email,
        },
        followupStatuses,
        total,
      },
      message: 'Recruiter follow-up status retrieved successfully',
    };
  }

  /**
   * Get list of all recruiters (for the selector dropdown)
   */
  async getRecruiters() {
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
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      data: recruiters,
      message: 'Recruiters list retrieved successfully',
    };
  }

  /**
   * API 3: Recruiter Performance Stages (Weekly / Monthly)
   * Returns counts of status changes per main stage grouped by day-of-week or month
   * for a given recruiter, based on CandidateProjectStatusHistory.
   */
  async getPerformanceStages(
    recruiterId: string,
    period: 'weekly' | 'monthly' = 'weekly',
  ) {
    const now = new Date();

    let dateFrom: Date;
    if (period === 'weekly') {
      // Start of current week (Monday)
      const day = now.getDay(); // 0=Sun
      const diff = day === 0 ? 6 : day - 1;
      dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
    } else {
      // Start of current year
      dateFrom = new Date(now.getFullYear(), 0, 1);
    }

    // Get all candidate-project IDs assigned to this recruiter
    const recruiterProjects = await this.prisma.candidateProjects.findMany({
      where: { recruiterId },
      select: { id: true },
    });
    const cpIds = recruiterProjects.map((cp) => cp.id);

    if (cpIds.length === 0) {
      return {
        success: true,
        data: { period, stages: [] },
        message: 'No data found for this recruiter',
      };
    }

    // Fetch all status history entries for this recruiter's candidates in the date range
    const history =
      await this.prisma.candidateProjectStatusHistory.findMany({
        where: {
          candidateProjectMapId: { in: cpIds },
          statusChangedAt: { gte: dateFrom },
          mainStatusSnapshot: { not: null },
        },
        select: {
          mainStatusSnapshot: true,
          subStatusSnapshot: true,
          statusChangedAt: true,
        },
        orderBy: { statusChangedAt: 'asc' },
      });

    // Map sub-status snapshots to the chart stage keys
    const SUB_STATUS_TO_STAGE: Record<string, string> = {
      // nominated
      nominated_initial: 'nominated',
      // documents
      documents_verified: 'documentVerified',
      submitted_to_client: 'submittedToClient',
      // interview
      interview_passed: 'interviewPassed',
      // processing
      transfered_to_processing: 'readyForProcessing',
      processing_in_progress: 'readyForProcessing',
      processing_completed: 'readyForProcessing',
      ready_for_final: 'readyForProcessing',
      // final
      hired: 'hired',
    };

    // Fallback: map main status snapshot to chart stage
    const MAIN_STATUS_TO_STAGE: Record<string, string> = {
      nominated: 'nominated',
      documents: 'documentVerified',
      interview: 'interviewPassed',
      processing: 'readyForProcessing',
      final: 'hired',
    };

    const STAGE_KEYS = [
      'nominated',
      'documentVerified',
      'submittedToClient',
      'interviewPassed',
      'readyForProcessing',
      'hired',
    ];

    if (period === 'weekly') {
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const buckets: Record<string, Record<string, number>> = {};
      dayNames.forEach((d) => {
        buckets[d] = {};
        STAGE_KEYS.forEach((s) => (buckets[d][s] = 0));
      });

      for (const h of history) {
        const jsDay = h.statusChangedAt.getDay(); // 0=Sun
        const dayIdx = jsDay === 0 ? 6 : jsDay - 1;
        const dayName = dayNames[dayIdx];

        const sub = (h.subStatusSnapshot || '').toLowerCase();
        const main = (h.mainStatusSnapshot || '').toLowerCase();
        const stage = SUB_STATUS_TO_STAGE[sub] || MAIN_STATUS_TO_STAGE[main];
        if (stage && buckets[dayName]) {
          buckets[dayName][stage]++;
        }
      }

      const stages = dayNames.map((day) => ({ day, ...buckets[day] }));
      return {
        success: true,
        data: { period, stages },
        message: 'Weekly performance stages retrieved successfully',
      };
    } else {
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      const buckets: Record<string, Record<string, number>> = {};
      monthNames.forEach((m) => {
        buckets[m] = {};
        STAGE_KEYS.forEach((s) => (buckets[m][s] = 0));
      });

      for (const h of history) {
        const monthName = monthNames[h.statusChangedAt.getMonth()];

        const sub = (h.subStatusSnapshot || '').toLowerCase();
        const main = (h.mainStatusSnapshot || '').toLowerCase();
        const stage = SUB_STATUS_TO_STAGE[sub] || MAIN_STATUS_TO_STAGE[main];
        if (stage && buckets[monthName]) {
          buckets[monthName][stage]++;
        }
      }

      // Only return months up to the current month
      const currentMonthIdx = now.getMonth();
      const stages = monthNames
        .slice(0, currentMonthIdx + 1)
        .map((month) => ({ month, ...buckets[month] }));

      return {
        success: true,
        data: { period, stages },
        message: 'Monthly performance stages retrieved successfully',
      };
    }
  }

  /**
   * API 4: Recruiter Candidates List
   * Returns paginated list of candidates assigned to a recruiter
   * with search, status filter and sorting.
   */
  async getRecruiterCandidates(
    recruiterId: string,
    options: {
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { search, page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    // Build candidate filter from search
    const searchFilter = search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { candidateCode: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { mobileNumber: { contains: search } },
          ],
        }
      : {};

    const where = {
      recruiterId,
      isActive: true,
      candidate: searchFilter,
    };

    const [assignments, total] = await Promise.all([
      this.prisma.candidateRecruiterAssignment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { assignedAt: 'desc' as const },
        include: {
          candidate: {
            select: {
              id: true,
              candidateCode: true,
              firstName: true,
              lastName: true,
              email: true,
              countryCode: true,
              mobileNumber: true,
              source: true,
              profileImage: true,
              currentStatus: {
                select: { statusName: true },
              },
              projects: {
                select: { id: true },
              },
            },
          },
          createdByUser: {
            select: { name: true },
          },
          assignedByUser: {
            select: { name: true },
          },
        },
      }),
      this.prisma.candidateRecruiterAssignment.count({ where }),
    ]);

    const candidates = assignments.map((a) => ({
      id: a.candidate.id,
      fullName: `${a.candidate.firstName} ${a.candidate.lastName}`,
      candidateCode: a.candidate.candidateCode ?? null,
      phone: `${a.candidate.countryCode} ${a.candidate.mobileNumber}`,
      email: a.candidate.email || '',
      status: a.candidate.currentStatus?.statusName || 'Untouched',
      projectCount: a.candidate.projects.length,
      source: a.candidate.source || 'manual',
      createdBy: a.createdByUser?.name || a.assignedByUser?.name || '',
      profileImage: a.candidate.profileImage || '',
    }));

    return {
      success: true,
      data: {
        candidates,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      message: 'Recruiter candidates retrieved successfully',
    };
  }

  /** Candidates owned by recruiter (active assignment or project mapping). */
  private buildRecruiterCandidateScope(
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

  private buildCrmStatusSnapshotFilter(
    statusNames: readonly string[],
  ): Prisma.CandidateStatusHistoryWhereInput {
    return {
      OR: statusNames.map((statusName) => ({
        statusNameSnapshot: { equals: statusName, mode: 'insensitive' },
      })),
    };
  }

  private async countDistinctCandidatesWithCrmStatusInPeriod(
    recruiterId: string,
    statusNames: readonly string[],
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    return this.prisma.candidate.count({
      where: {
        ...this.buildRecruiterCandidateScope(recruiterId),
        statusHistories: {
          some: {
            statusUpdatedAt: { gte: periodStart, lte: periodEnd },
            ...this.buildCrmStatusSnapshotFilter(statusNames),
          },
        },
      },
    });
  }

  private async countDistinctCandidatesWithProjectSubStatusInPeriod(
    recruiterId: string,
    subStatusName: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    return this.prisma.candidate.count({
      where: {
        ...this.buildRecruiterCandidateScope(recruiterId),
        projects: {
          some: {
            recruiterId,
            projectStatusHistory: {
              some: {
                subStatus: { name: subStatusName },
                statusChangedAt: { gte: periodStart, lte: periodEnd },
              },
            },
          },
        },
      },
    });
  }

  private async countDistinctDeployedInPeriod(
    recruiterId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    const scope = this.buildRecruiterCandidateScope(recruiterId);
    const [projectDeployed, crmDeployed] = await Promise.all([
      this.prisma.candidate.findMany({
        where: {
          ...scope,
          projects: {
            some: {
              recruiterId,
              projectStatusHistory: {
                some: {
                  subStatus: {
                    name: PERFORMANCE_PROJECT_SUB_STATUSES.deployed,
                  },
                  statusChangedAt: { gte: periodStart, lte: periodEnd },
                },
              },
            },
          },
        },
        select: { id: true },
        distinct: ['id'],
      }),
      this.prisma.candidate.findMany({
        where: {
          ...scope,
          statusHistories: {
            some: {
              statusUpdatedAt: { gte: periodStart, lte: periodEnd },
              ...this.buildCrmStatusSnapshotFilter(DEPLOYED_CRM_STATUS_NAMES),
            },
          },
        },
        select: { id: true },
        distinct: ['id'],
      }),
    ]);

    const uniqueIds = new Set([
      ...projectDeployed.map((c) => c.id),
      ...crmDeployed.map((c) => c.id),
    ]);
    return uniqueIds.size;
  }

  async getStageCountsForPeriod(
    recruiterId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<PerformanceStageCounts> {
    const [
      positiveCandidate,
      documentVerified,
      interviewShortlisted,
      interviewPassed,
      processing,
      deployed,
    ] = await Promise.all([
      this.countDistinctCandidatesWithCrmStatusInPeriod(
        recruiterId,
        POSITIVE_CRM_STATUS_NAMES,
        periodStart,
        periodEnd,
      ),
      this.countDistinctCandidatesWithProjectSubStatusInPeriod(
        recruiterId,
        PERFORMANCE_PROJECT_SUB_STATUSES.documentVerified,
        periodStart,
        periodEnd,
      ),
      this.countDistinctCandidatesWithProjectSubStatusInPeriod(
        recruiterId,
        PERFORMANCE_PROJECT_SUB_STATUSES.interviewShortlisted,
        periodStart,
        periodEnd,
      ),
      this.countDistinctCandidatesWithProjectSubStatusInPeriod(
        recruiterId,
        PERFORMANCE_PROJECT_SUB_STATUSES.interviewPassed,
        periodStart,
        periodEnd,
      ),
      this.countDistinctCandidatesWithProjectSubStatusInPeriod(
        recruiterId,
        PERFORMANCE_PROJECT_SUB_STATUSES.processing,
        periodStart,
        periodEnd,
      ),
      this.countDistinctDeployedInPeriod(
        recruiterId,
        periodStart,
        periodEnd,
      ),
    ]);

    return {
      positiveCandidate,
      documentVerified,
      interviewShortlisted,
      interviewPassed,
      processing,
      deployed,
    };
  }

  private buildRatingBlock(
    stageCounts: PerformanceStageCounts,
    period: { year: number; month?: number },
  ) {
    const score = computePerformanceScore(stageCounts);
    return {
      score,
      rating: resolvePerformanceRating(score),
      stageCounts,
      period,
    };
  }

  /**
   * Weighted performance rating for a recruiter (monthly + yearly).
   */
  async getPerformanceRating(
    recruiterId: string,
    options: { year?: number; month?: number } = {},
  ) {
    const now = new Date();
    const year = options.year ?? now.getFullYear();
    const month = options.month ?? now.getMonth() + 1;

    const recruiter = await this.prisma.user.findUnique({
      where: { id: recruiterId },
      select: { id: true, name: true, email: true },
    });

    if (!recruiter) {
      return {
        success: false,
        data: null,
        message: 'Recruiter not found',
      };
    }

    const monthlyBounds = getMonthPeriodBounds(year, month);
    const yearlyBounds = getYearPeriodBounds(year);

    const [monthlyCounts, yearlyCounts] = await Promise.all([
      this.getStageCountsForPeriod(
        recruiterId,
        monthlyBounds.start,
        monthlyBounds.end,
      ),
      this.getStageCountsForPeriod(
        recruiterId,
        yearlyBounds.start,
        yearlyBounds.end,
      ),
    ]);

    return {
      success: true,
      data: {
        recruiter: {
          id: recruiter.id,
          name: recruiter.name,
          email: recruiter.email,
        },
        monthly: this.buildRatingBlock(monthlyCounts, { year, month }),
        yearly: this.buildRatingBlock(yearlyCounts, { year }),
      },
      message: 'Recruiter performance rating retrieved successfully',
    };
  }

  /**
   * Rank recruiters by monthly performance score (for admin dashboard).
   */
  async getPerformanceLeaderboard(
    options: {
      year?: number;
      month?: number;
      limit?: number;
      period?: 'monthly' | 'yearly';
    } = {},
  ) {
    const now = new Date();
    const year = options.year ?? now.getFullYear();
    const month = options.month ?? now.getMonth() + 1;
    const limit = options.limit ?? 10;
    const period = options.period ?? 'monthly';
    const { start, end } =
      period === 'yearly'
        ? getYearPeriodBounds(year)
        : getMonthPeriodBounds(year, month);

    const recruiters = await this.prisma.user.findMany({
      where: withActiveAccountStatus({
        userRoles: {
          some: {
            role: { name: 'Recruiter' },
          },
        },
      }),
      select: {
        id: true,
        name: true,
        email: true,
        countryCode: true,
        mobileNumber: true,
        profileImage: true,
      },
    });

    const entries = await Promise.all(
      recruiters.map(async (recruiter) => {
        const stageCounts = await this.getStageCountsForPeriod(
          recruiter.id,
          start,
          end,
        );
        const score = computePerformanceScore(stageCounts);
        return {
          id: recruiter.id,
          name: recruiter.name,
          email: recruiter.email,
          phone: recruiter.mobileNumber
            ? `${recruiter.countryCode ?? ''}${recruiter.mobileNumber}`
            : undefined,
          role: 'Affinks Recruiter',
          avatarUrl: recruiter.profileImage || undefined,
          performanceScore: score,
          rating: resolvePerformanceRating(score),
          stageCounts,
          placementsThisMonth: stageCounts.deployed,
        };
      }),
    );

    const sorted = entries.sort((a, b) => {
      if (b.performanceScore !== a.performanceScore) {
        return b.performanceScore - a.performanceScore;
      }
      if (b.stageCounts.deployed !== a.stageCounts.deployed) {
        return b.stageCounts.deployed - a.stageCounts.deployed;
      }
      if (b.stageCounts.interviewPassed !== a.stageCounts.interviewPassed) {
        return b.stageCounts.interviewPassed - a.stageCounts.interviewPassed;
      }
      if (b.stageCounts.documentVerified !== a.stageCounts.documentVerified) {
        return b.stageCounts.documentVerified - a.stageCounts.documentVerified;
      }
      return b.stageCounts.positiveCandidate - a.stageCounts.positiveCandidate;
    });

    const leaderboard = sorted.slice(0, limit);

    return {
      success: true,
      data: {
        year,
        month: period === 'yearly' ? undefined : month,
        period,
        leaderboard,
      },
      message: 'Recruiter performance leaderboard retrieved successfully',
    };
  }

  stageCountsToActivities(
    stageCounts: PerformanceStageCounts,
  ): Array<{ activity: string; value: number }> {
    return (
      Object.keys(PERFORMANCE_STAGE_ACTIVITY_LABELS) as Array<
        keyof PerformanceStageCounts
      >
    ).map((key) => ({
      activity: PERFORMANCE_STAGE_ACTIVITY_LABELS[key],
      value: stageCounts[key],
    }));
  }
}
