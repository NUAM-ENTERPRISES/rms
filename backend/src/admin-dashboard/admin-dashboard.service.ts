import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AdminDashboardStats } from './types';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

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

    const projectIds = projects.map((p) => p.id);

    const filledStatuses = ['hired', 'deployed'];
    const candidateProjects = await this.prisma.candidateProjects.findMany({
      where: {
        projectId: { in: projectIds },
        roleNeededId: { not: null },
        currentProjectStatus: {
          statusName: { in: filledStatuses },
        },
      },
      select: {
        projectId: true,
        roleNeededId: true,
      },
    });

    const filledMap = new Map<string, number>();
    candidateProjects.forEach((cp) => {
      if (!cp.roleNeededId) return;
      const key = `${cp.projectId}:${cp.roleNeededId}`;
      filledMap.set(key, (filledMap.get(key) ?? 0) + 1);
    });

    const projectRoles = projects.map((project) => ({
      projectId: project.id,
      projectName: project.title,
      roles: project.rolesNeeded.map((role) => ({
        role: role.designation,
        required: role.quantity,
        filled: filledMap.get(`${project.id}:${role.id}`) ?? 0,
      })),
    }));

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

  async getTopRecruiterStats(
    year?: number,
    month?: number,
    limit: number = 1,
  ): Promise<{
    success: boolean;
    data: {
      topRecruiter: {
        name: string;
        role: string;
        placementsThisMonth: number;
        email?: string;
        phone?: string;
        avatarUrl?: string;
      };
      recruiterActivities: Array<{ activity: string; value: number }>;
    };
    message: string;
  }> {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = typeof month === 'number' ? month : now.getMonth() + 1; // 1-based

    const periodStart = new Date(targetYear, targetMonth - 1, 1);
    const periodEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    // Get all recruiter users
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
      select: {
        id: true,
        name: true,
        email: true,
        countryCode: true,
        mobileNumber: true,
        profileImage: true,
      },
    });

    const recruiterSummary = await Promise.all(
      recruiters.map(async (recruiter) => {
        const candidateProjects = await this.prisma.candidateProjects.findMany({
          where: {
            recruiterId: recruiter.id,
            assignedAt: {
              gte: periodStart,
              lte: periodEnd,
            },
          },
          include: {
            currentProjectStatus: {
              select: { statusName: true },
            },
          },
        });

        const assigned = candidateProjects.length;
        const nominated = candidateProjects.filter((cp) =>
          ['nominated', 'nominated_initial'].includes(
            cp.currentProjectStatus?.statusName || '',
          ),
        ).length;
        const documentsVerified = candidateProjects.filter((cp) =>
          ['documents_verified', 'verified_documents', 'submitted_to_client'].includes(
            cp.currentProjectStatus?.statusName || '',
          ),
        ).length;
        const interviewPassed = candidateProjects.filter((cp) =>
          ['interview_passed', 'shortlisted', 'interview_selected'].includes(
            cp.currentProjectStatus?.statusName || '',
          ),
        ).length;
        const hired = candidateProjects.filter((cp) =>
          ['hired', 'deployed'].includes(cp.currentProjectStatus?.statusName || ''),
        ).length;

        return {
          id: recruiter.id,
          name: recruiter.name,
          email: recruiter.email,
          phone: recruiter.mobileNumber ? `${recruiter.countryCode}${recruiter.mobileNumber}` : undefined,
          role: 'Affinks Recruiter', // This can be enhanced to fetch actual role if needed
          avatarUrl: recruiter.profileImage || undefined,
          assigned,
          nominated,
          documentsVerified,
          interviewPassed,
          hired,
        };
      }),
    );

    const sorted = recruiterSummary.sort((a, b) => {
      if (a.hired !== b.hired) return b.hired - a.hired;
      if (a.interviewPassed !== b.interviewPassed)
        return b.interviewPassed - a.interviewPassed;
      if (a.documentsVerified !== b.documentsVerified)
        return b.documentsVerified - a.documentsVerified;
      return b.assigned - a.assigned;
    });

    const top = sorted.slice(0, limit)[0] ?? {
      name: 'N/A',
      role: 'N/A',
      placementsThisMonth: 0,
      avatarUrl: undefined,
    };

    const recruiterActivities = [
      { activity: 'Projects Assigned', value: top.assigned ?? 0 },
      { activity: 'Documents Verified', value: top.documentsVerified ?? 0 },
      { activity: 'Interviews Passed', value: top.interviewPassed ?? 0 },
      { activity: 'Candidates Hired', value: top.hired ?? 0 },
    ];

    return {
      success: true,
      data: {
        topRecruiter: {
          name: top.name,
          role: top.role,
          placementsThisMonth: top.hired,
          email: top.email,
          phone: top.phone,
          avatarUrl: top.avatarUrl,
        },
        recruiterActivities,
      },
      message: 'Top recruiter stats retrieved successfully',
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

