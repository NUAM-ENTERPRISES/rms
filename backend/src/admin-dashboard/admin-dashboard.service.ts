import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RecruiterAnalyticsService } from '../analytics/recruiter/recruiter-analytics.service';
import { buildProjectRoleHiringRows } from '../common/dashboard/project-role-hiring.util';
import { AdminDashboardStats } from './types';

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recruiterAnalyticsService: RecruiterAnalyticsService,
  ) {}

  async getDashboardStats(): Promise<{ success: boolean; data: AdminDashboardStats; message: string }> {
    const [totalCandidates, activeClients, openJobs, candidatesPlaced] = await Promise.all([
      this.prisma.candidate.count(),
      this.prisma.client.count({
        where: {
          projects: {
            some: {
              status: 'active',
            },
          },
        },
      }),
      this.prisma.project.count({
        where: {
          status: 'active',
        },
      }),
      this.prisma.candidate.count({
        where: {
          OR: [
            { currentStatus: { statusName: 'hired' } },
            { currentStatus: { statusName: 'deployed' } },
          ],
        },
      }),
    ]);

    return {
      success: true,
      data: {
        totalCandidates,
        activeClients,
        openJobs,
        candidatesPlaced,
      },
      message: 'Admin dashboard stats retrieved successfully',
    };
  }

  async getHiringTrend(): Promise<{ success: boolean; data: import('./types').HiringTrendData; message: string }> {
    const now = new Date();
    const startYear = now.getFullYear() - 5;
    const sinceDate = new Date(startYear, 0, 1);

    const statusesFound = await this.prisma.candidateStatusHistory.findMany({
      where: {
        statusNameSnapshot: {
          in: ['hired', 'deployed', 'Hired', 'Deployed'],
        },
        statusUpdatedAt: {
          gte: sinceDate,
        },
      },
      select: {
        statusUpdatedAt: true,
      },
    });

    const dailyBuckets: Record<string, number> = {};
    const monthlyBuckets: Record<string, number> = {};
    const yearlyBuckets: Record<string, number> = {};

    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - i));
      const key = date.toISOString().slice(0, 10); // YYYY-MM-DD
      dailyBuckets[key] = 0;
      return date;
    });

    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let m = 0; m < 12; m++) {
      monthlyBuckets[monthLabels[m]] = 0;
    }

    const years: number[] = [];
    for (let y = startYear; y <= now.getFullYear(); y++) {
      yearlyBuckets[y.toString()] = 0;
      years.push(y);
    }

    statusesFound.forEach((row) => {
      const entryDate = new Date(row.statusUpdatedAt);
      const entryDayKey = entryDate.toISOString().slice(0, 10);
      if (dailyBuckets.hasOwnProperty(entryDayKey)) {
        dailyBuckets[entryDayKey] += 1;
      }

      if (entryDate.getFullYear() === now.getFullYear()) {
        const monthKey = monthLabels[entryDate.getMonth()];
        monthlyBuckets[monthKey] = (monthlyBuckets[monthKey] ?? 0) + 1;
      }

      const yearKey = entryDate.getFullYear().toString();
      if (yearlyBuckets.hasOwnProperty(yearKey)) {
        yearlyBuckets[yearKey] += 1;
      }
    });

    const daily: import('./types').HiringTrendEntry[] = days.map((date) => ({
      period: date.toLocaleDateString('en-US', { weekday: 'short' }),
      placed: dailyBuckets[date.toISOString().slice(0, 10)] ?? 0,
    }));

    const monthly: import('./types').HiringTrendEntry[] = monthLabels.map((label) => ({
      period: label,
      placed: monthlyBuckets[label] ?? 0,
    }));

    const yearly: import('./types').HiringTrendEntry[] = years.map((year) => ({
      period: year.toString(),
      placed: yearlyBuckets[year.toString()] ?? 0,
    }));

    return {
      success: true,
      data: {
        daily,
        monthly,
        yearly,
      },
      message: 'Hiring trend data retrieved successfully',
    };
  }

  async getProjectRoleHiringStatus(
    queryDto?: {
      projectId?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    success: boolean;
    data: {
      projectRoles: Array<{
        projectId: string;
        projectName: string;
        roles: Array<{ role: string; required: number; filled: number }>;
      }>;
      pagination: {
        total: number;
        totalPages: number;
        page: number;
        limit: number;
      };
    };
    message: string;
  }> {
    const { projectId, search, page = 1, limit = 10 } = queryDto || {};
    const skip = (page - 1) * limit;

    const projectWhere: any = { status: 'active' };
    if (projectId) {
      projectWhere.id = projectId;
    }
    if (search) {
      projectWhere.title = { contains: search, mode: 'insensitive' };
    }

    const [total, projects] = await Promise.all([
      this.prisma.project.count({ where: projectWhere }),
      this.prisma.project.findMany({
        where: projectWhere,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          rolesNeeded: {
            select: {
              id: true,
              designation: true,
              quantity: true,
            },
          },
        },
      }),
    ]);

    const projectRoles = await buildProjectRoleHiringRows(this.prisma, projects);

    return {
      success: true,
      data: {
        projectRoles,
        pagination: {
          total,
          totalPages: Math.ceil(total / limit),
          page,
          limit,
        },
      },
      message: 'Project role hiring status retrieved successfully',
    };
  }

  private mapLeaderboardEntry(
    entry: {
      id: string;
      name: string;
      email: string;
      role: string;
      performanceScore: number;
      rating: string;
      placementsThisMonth: number;
      phone?: string;
      avatarUrl?: string;
    } | undefined,
  ): import('./types').RecruiterAwardWinner | null {
    if (!entry || !entry.id) {
      return null;
    }
    return {
      id: entry.id,
      name: entry.name,
      email: entry.email,
      role: entry.role,
      performanceScore: entry.performanceScore,
      rating: entry.rating,
      deployedCount: entry.placementsThisMonth,
      phone: entry.phone,
      avatarUrl: entry.avatarUrl,
    };
  }

  private mapLeaderboardRows(
    leaderboard: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      performanceScore: number;
      rating: string;
      placementsThisMonth: number;
      phone?: string;
      avatarUrl?: string;
    }>,
  ): import('./types').PerformanceLeaderboardEntry[] {
    return leaderboard.map((entry) => ({
      id: entry.id,
      name: entry.name,
      email: entry.email,
      role: entry.role,
      performanceScore: entry.performanceScore,
      rating: entry.rating,
      placementsThisMonth: entry.placementsThisMonth,
      phone: entry.phone,
      avatarUrl: entry.avatarUrl,
    }));
  }

  private awardWinnerToTopRecruiter(
    winner: import('./types').RecruiterAwardWinner | null,
  ): import('./types').TopRecruiter {
    if (!winner) {
      return {
        name: 'No recruiter ranked yet',
        role: 'Recruiter',
        placementsThisMonth: 0,
        performanceScore: 0,
        rating: '—',
      };
    }
    return {
      name: winner.name,
      role: winner.role,
      placementsThisMonth: winner.deployedCount,
      performanceScore: winner.performanceScore,
      rating: winner.rating,
      email: winner.email,
      phone: winner.phone,
      avatarUrl: winner.avatarUrl,
    };
  }

  async getTopRecruiterStats(
    year?: number,
    month?: number,
    limit: number = 5,
  ): Promise<{
    success: boolean;
    data: import('./types').TopRecruiterStatsData;
    message: string;
  }> {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = typeof month === 'number' ? month : now.getMonth() + 1;
    const leaderboardLimit = Math.max(limit, 5);

    const [monthlyResult, yearlyResult] = await Promise.all([
      this.recruiterAnalyticsService.getPerformanceLeaderboard({
        year: targetYear,
        month: targetMonth,
        limit: leaderboardLimit,
        period: 'monthly',
      }),
      this.recruiterAnalyticsService.getPerformanceLeaderboard({
        year: targetYear,
        limit: leaderboardLimit,
        period: 'yearly',
      }),
    ]);

    const monthlyLeaderboard = monthlyResult.data.leaderboard;
    const yearlyLeaderboard = yearlyResult.data.leaderboard;
    const monthTop = monthlyLeaderboard[0];
    const yearTop = yearlyLeaderboard[0];

    const recruiterOfTheMonth = this.mapLeaderboardEntry(monthTop);
    const recruiterOfTheYear = this.mapLeaderboardEntry(yearTop);

    const emptyStageCounts = {
      positiveCandidate: 0,
      documentVerified: 0,
      interviewShortlisted: 0,
      interviewPassed: 0,
      processing: 0,
      deployed: 0,
    };

    const recruiterActivities =
      this.recruiterAnalyticsService.stageCountsToActivities(
        monthTop?.stageCounts ?? emptyStageCounts,
      );

    return {
      success: true,
      data: {
        period: { year: targetYear, month: targetMonth },
        recruiterOfTheMonth,
        recruiterOfTheYear,
        monthlyLeaderboard: this.mapLeaderboardRows(monthlyLeaderboard),
        yearlyLeaderboard: this.mapLeaderboardRows(yearlyLeaderboard),
        topRecruiter: this.awardWinnerToTopRecruiter(recruiterOfTheMonth),
        recruiterActivities,
        leaderboard: this.mapLeaderboardRows(monthlyLeaderboard),
      },
      message: 'Recruiter performance awards retrieved successfully',
    };
  }

  async getUpcomingInterviews(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ success: boolean; data: import('./types').AdminDashboardUpcomingInterviewsData; message: string }> {
    const now = new Date();
    const where = {
      scheduledTime: { gte: now },
      candidateProjectMap: {
        is: {
          subStatus: {
            is: {
              name: 'interview_scheduled',
            },
          },
        },
      },
    };

    const total = await this.prisma.interview.count({ where });

    const interviews = await this.prisma.interview.findMany({
      where,
      include: {
        candidateProjectMap: {
          include: {
            candidate: {
              select: { firstName: true, lastName: true },
            },
            project: {
              select: { title: true },
            },
            roleNeeded: {
              select: { designation: true },
            },
            recruiter: {
              select: { name: true },
            },
            subStatus: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { scheduledTime: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const projection = interviews.map((iv) => {
      const scheduledTime = new Date(iv.scheduledTime);
      const day = scheduledTime.toLocaleDateString('en-US', { weekday: 'short' });
      const time = scheduledTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const map = iv.candidateProjectMap;

      return {
        day,
        candidate: map?.candidate ? `${map.candidate.firstName} ${map.candidate.lastName}` : 'Unknown',
        project: map?.project?.title ?? 'Unknown',
        role: map?.roleNeeded?.designation ?? 'Unknown',
        recruiter: map?.recruiter?.name ?? 'Unassigned',
        time,
        scheduledTime: iv.scheduledTime.toISOString(),
        status: 'Scheduled' as import('./types').InterviewStatus,
      };
    });

    const dayKeys = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const countByDay: Record<string, number> = dayKeys.reduce((acc, d) => ({ ...acc, [d]: 0 }), {});

    projection.forEach((entry) => {
      if (countByDay.hasOwnProperty(entry.day)) {
        countByDay[entry.day] += 1;
      }
    });

    const chartData: import('./types').InterviewChartEntry[] = dayKeys.map((d) => ({
      day: d,
      interviews: countByDay[d] ?? 0,
    }));

    return {
      success: true,
      data: {
        chartData,
        interviews: projection,
        pagination: {
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          page,
          limit,
        },
      },
      message: 'Upcoming interviews retrieved successfully',
    };
  }
}

