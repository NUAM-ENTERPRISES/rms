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
      { activity: 'Sent for Verification', value: top.documentsVerified ?? 0 },
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
}

