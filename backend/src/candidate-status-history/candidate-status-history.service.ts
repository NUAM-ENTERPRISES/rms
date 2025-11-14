import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CandidateStatusHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get status history for a specific candidate
   */
  async getCandidateStatusHistory(candidateId: string) {
    // Check if candidate exists
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        currentStatusId: true,
        currentStatus: {
          select: {
            id: true,
            statusName: true,
          },
        },
      },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    // Get status history
    const history = await this.prisma.candidateStatusHistory.findMany({
      where: { candidateId },
      orderBy: { statusUpdatedAt: 'desc' },
    });

    return {
      success: true,
      data: {
        candidate: {
          id: candidate.id,
          name: `${candidate.firstName} ${candidate.lastName}`,
          currentStatus: candidate.currentStatus,
        },
        history,
        totalEntries: history.length,
      },
      message: 'Candidate status history retrieved successfully',
    };
  }

  /**
   * Get a single status history entry by ID
   */
  async getHistoryEntry(historyId: string) {
    const history = await this.prisma.candidateStatusHistory.findUnique({
      where: { id: historyId },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            countryCode: true,
            mobileNumber: true,
          },
        },
      },
    });

    if (!history) {
      throw new NotFoundException(
        `Status history entry with ID ${historyId} not found`,
      );
    }

    return {
      success: true,
      data: history,
      message: 'Status history entry retrieved successfully',
    };
  }

  /**
   * Get status change statistics for a candidate
   */
  async getCandidateStatusStats(candidateId: string) {
    // Check if candidate exists
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    // Get all status history
    const history = await this.prisma.candidateStatusHistory.findMany({
      where: { candidateId },
      orderBy: { statusUpdatedAt: 'asc' },
    });

    if (history.length === 0) {
      return {
        success: true,
        data: {
          candidate: {
            id: candidate.id,
            name: `${candidate.firstName} ${candidate.lastName}`,
          },
          totalStatusChanges: 0,
          uniqueStatuses: 0,
          statusBreakdown: {},
          firstStatusChange: null,
          lastStatusChange: null,
          totalNotifications: 0,
        },
        message: 'No status history found for this candidate',
      };
    }

    // Calculate statistics
    const statusBreakdown = history.reduce(
      (acc, entry) => {
        const statusName = entry.statusNameSnapshot;
        if (!acc[statusName]) {
          acc[statusName] = 0;
        }
        acc[statusName]++;
        return acc;
      },
      {} as Record<string, number>,
    );

    const uniqueStatuses = Object.keys(statusBreakdown).length;
    const totalNotifications = history.reduce(
      (sum, entry) => sum + entry.notificationCount,
      0,
    );

    return {
      success: true,
      data: {
        candidate: {
          id: candidate.id,
          name: `${candidate.firstName} ${candidate.lastName}`,
        },
        totalStatusChanges: history.length,
        uniqueStatuses,
        statusBreakdown,
        firstStatusChange: history[0],
        lastStatusChange: history[history.length - 1],
        totalNotifications,
      },
      message: 'Candidate status statistics retrieved successfully',
    };
  }

  /**
   * Get status history for multiple candidates (useful for reporting)
   */
  async getMultipleCandidatesHistory(candidateIds: string[]) {
    const histories = await Promise.all(
      candidateIds.map((candidateId) =>
        this.getCandidateStatusHistory(candidateId).catch(() => null),
      ),
    );

    const validHistories = histories.filter((h) => h !== null);

    return {
      success: true,
      data: {
        candidates: validHistories,
        totalCandidates: validHistories.length,
      },
      message: 'Multiple candidate histories retrieved successfully',
    };
  }

  /**
   * Get status history by status name
   */
  async getHistoryByStatus(statusName: string) {
    const history = await this.prisma.candidateStatusHistory.findMany({
      where: { statusNameSnapshot: statusName },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            countryCode: true,
            mobileNumber: true,
          },
        },
      },
      orderBy: { statusUpdatedAt: 'desc' },
    });

    return {
      success: true,
      data: {
        statusName,
        history,
        totalEntries: history.length,
      },
      message: `Status history for '${statusName}' retrieved successfully`,
    };
  }

  /**
   * Get status history by date range
   */
  async getHistoryByDateRange(startDate: Date, endDate: Date) {
    const history = await this.prisma.candidateStatusHistory.findMany({
      where: {
        statusUpdatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            countryCode: true,
            mobileNumber: true,
          },
        },
      },
      orderBy: { statusUpdatedAt: 'desc' },
    });

    return {
      success: true,
      data: {
        dateRange: {
          from: startDate,
          to: endDate,
        },
        history,
        totalEntries: history.length,
      },
      message: 'Status history for date range retrieved successfully',
    };
  }

  /**
   * Get recent status changes (last N days)
   */
  async getRecentStatusChanges(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const history = await this.prisma.candidateStatusHistory.findMany({
      where: {
        statusUpdatedAt: {
          gte: startDate,
        },
      },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            countryCode: true,
            mobileNumber: true,
          },
        },
      },
      orderBy: { statusUpdatedAt: 'desc' },
    });

    return {
      success: true,
      data: {
        days,
        history,
        totalEntries: history.length,
      },
      message: `Recent status changes (last ${days} days) retrieved successfully`,
    };
  }
}
