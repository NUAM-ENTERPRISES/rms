import { Test, TestingModule } from '@nestjs/testing';
import { AdminDashboardService } from '../admin-dashboard.service';
import { PrismaService } from '../../database/prisma.service';
import { RecruiterAnalyticsService } from '../../analytics/recruiter/recruiter-analytics.service';

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;
  let prismaService: any;
  let recruiterAnalyticsService: jest.Mocked<RecruiterAnalyticsService>;

  const mockRecruiterAnalyticsService = {
    getPerformanceLeaderboard: jest.fn(),
    stageCountsToActivities: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
    },
    candidate: {
      count: jest.fn(),
    },
    client: {
      count: jest.fn(),
    },
    project: {
      count: jest.fn(),
    },
    candidateStatusHistory: {
      findMany: jest.fn(),
    },
    candidateProjects: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDashboardService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RecruiterAnalyticsService,
          useValue: mockRecruiterAnalyticsService,
        },
      ],
    }).compile();

    service = module.get<AdminDashboardService>(AdminDashboardService);
    prismaService = module.get(PrismaService);
    recruiterAnalyticsService = module.get(RecruiterAnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return dashboard stats', async () => {
    prismaService.candidate.count
      .mockResolvedValueOnce(500) // totalCandidates
      .mockResolvedValueOnce(140); // candidatesPlaced

    prismaService.client.count.mockResolvedValue(80);
    prismaService.project.count.mockResolvedValue(28);

    const result = await service.getDashboardStats();

    expect(result).toEqual({
      success: true,
      data: {
        totalCandidates: 500,
        activeClients: 80,
        openJobs: 28,
        candidatesPlaced: 140,
      },
      message: 'Admin dashboard stats retrieved successfully',
    });

    expect(prismaService.candidate.count).toHaveBeenCalledTimes(2);
    expect(prismaService.client.count).toHaveBeenCalledTimes(1);
    expect(prismaService.project.count).toHaveBeenCalledTimes(1);
  });

  it('should return hiring trend data', async () => {
    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(now.getDate() - 3);

    prismaService.candidateStatusHistory.findMany.mockResolvedValue([
      { statusUpdatedAt: threeDaysAgo },
      { statusUpdatedAt: now },
      { statusUpdatedAt: new Date(now.getFullYear() - 1, 2, 1) },
    ]);

    const result = await service.getHiringTrend();

    expect(result.success).toBe(true);
    expect(result.data.daily.length).toBe(7);
    expect(result.data.monthly.length).toBe(12);
    expect(result.data.yearly.length).toBe(6);

    const todayLabel = now.toLocaleDateString('en-US', { weekday: 'short' });
    const todayEntry = result.data.daily.find((d) => d.period === todayLabel);
    expect(todayEntry).toBeDefined();
    expect(todayEntry?.placed).toBe(1);

    const monthKey = now.toLocaleString('en-US', { month: 'short' });
    const monthEntry = result.data.monthly.find((m) => m.period === monthKey);
    expect(monthEntry?.placed).toBeGreaterThanOrEqual(1);
  });

  it('should return project role hiring status for a specific project', async () => {
    prismaService.project.findMany = jest.fn().mockResolvedValue([
      {
        id: 'proj-1',
        title: 'Aster Hospital',
        rolesNeeded: [
          { id: 'role-1', designation: 'ICU Nurse', quantity: 5 },
          { id: 'role-2', designation: 'Ward Nurse', quantity: 4 },
        ],
      },
      {
        id: 'proj-2',
        title: 'MedCare Clinic',
        rolesNeeded: [{ id: 'role-3', designation: 'Pharmacist', quantity: 2 }],
      },
    ]);

    prismaService.candidateProjects.findMany = jest.fn().mockResolvedValue([
      { projectId: 'proj-1', roleNeededId: 'role-1' },
      { projectId: 'proj-1', roleNeededId: 'role-1' },
      { projectId: 'proj-1', roleNeededId: 'role-2' },
      { projectId: 'proj-2', roleNeededId: 'role-3' },
      { projectId: 'proj-2', roleNeededId: 'role-3' },
      { projectId: 'proj-2', roleNeededId: 'role-3' },
    ]);

    const result = await service.getProjectRoleHiringStatus();

    expect(result).toEqual({
      success: true,
      data: {
        projectRoles: [
          {
            projectId: 'proj-1',
            projectName: 'Aster Hospital',
            roles: [
              { role: 'ICU Nurse', required: 5, filled: 2 },
              { role: 'Ward Nurse', required: 4, filled: 1 },
            ],
          },
          {
            projectId: 'proj-2',
            projectName: 'MedCare Clinic',
            roles: [{ role: 'Pharmacist', required: 2, filled: 3 }],
          },
        ],
      },
      message: 'Project role hiring status retrieved successfully',
    });

    expect(prismaService.project.findMany).toHaveBeenCalledTimes(1);
    expect(prismaService.candidateProjects.findMany).toHaveBeenCalledTimes(1);
  });

  it('should return project role hiring status filtered by projectId', async () => {
    prismaService.project.findMany = jest.fn().mockResolvedValue([
      {
        id: 'proj-1',
        title: 'Aster Hospital',
        rolesNeeded: [{ id: 'role-1', designation: 'ICU Nurse', quantity: 5 }],
      },
    ]);

    prismaService.candidateProjects.findMany = jest.fn().mockResolvedValue([
      { projectId: 'proj-1', roleNeededId: 'role-1' },
      { projectId: 'proj-1', roleNeededId: 'role-1' },
    ]);

    const result = await service.getProjectRoleHiringStatus({ projectId: 'proj-1' });

    expect(result.data.projectRoles).toHaveLength(1);
    expect(result.data.projectRoles[0].roles[0]).toEqual({ role: 'ICU Nurse', required: 5, filled: 2 });
    expect(prismaService.project.findMany).toHaveBeenCalledWith({
      where: { status: 'active', id: 'proj-1' },
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
    });
  });

  it('should return month and year recruiter awards by performance score', async () => {
    const stageCounts = {
      positiveCandidate: 10,
      documentVerified: 8,
      interviewShortlisted: 7,
      interviewPassed: 5,
      processing: 3,
      deployed: 4,
    };

    const monthEntry = {
      id: 'rec-1',
      name: 'Emma',
      email: 'emma@example.com',
      phone: '+919876543210',
      role: 'Affinks Recruiter',
      avatarUrl: 'https://example.com/emma.png',
      performanceScore: 113,
      rating: 'Outstanding',
      placementsThisMonth: 4,
      stageCounts,
    };

    const yearEntry = {
      id: 'rec-2',
      name: 'Alex',
      email: 'alex@example.com',
      phone: '+919999999999',
      role: 'Affinks Recruiter',
      avatarUrl: undefined,
      performanceScore: 200,
      rating: 'Top Performer',
      placementsThisMonth: 8,
      stageCounts,
    };

    mockRecruiterAnalyticsService.getPerformanceLeaderboard
      .mockResolvedValueOnce({
        success: true,
        data: { year: 2026, month: 4, period: 'monthly', leaderboard: [monthEntry] },
        message: 'ok',
      })
      .mockResolvedValueOnce({
        success: true,
        data: { year: 2026, period: 'yearly', leaderboard: [yearEntry] },
        message: 'ok',
      });

    mockRecruiterAnalyticsService.stageCountsToActivities.mockReturnValue([
      { activity: 'Positive Candidate', value: 10 },
      { activity: 'Deployed', value: 4 },
    ]);

    const result = await service.getTopRecruiterStats(2026, 4, 5);

    expect(recruiterAnalyticsService.getPerformanceLeaderboard).toHaveBeenNthCalledWith(1, {
      year: 2026,
      month: 4,
      limit: 5,
      period: 'monthly',
    });
    expect(recruiterAnalyticsService.getPerformanceLeaderboard).toHaveBeenNthCalledWith(2, {
      year: 2026,
      limit: 5,
      period: 'yearly',
    });

    expect(result.data.recruiterOfTheMonth?.name).toBe('Emma');
    expect(result.data.recruiterOfTheYear?.name).toBe('Alex');
    expect(result.data.period).toEqual({ year: 2026, month: 4 });
    expect(result.data.topRecruiter.name).toBe('Emma');
  });
});
