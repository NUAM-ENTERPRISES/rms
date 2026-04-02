import { Test, TestingModule } from '@nestjs/testing';
import { AdminDashboardService } from '../admin-dashboard.service';
import { PrismaService } from '../../database/prisma.service';

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;
  let prismaService: any;

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
      ],
    }).compile();

    service = module.get<AdminDashboardService>(AdminDashboardService);
    prismaService = module.get(PrismaService);
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

  it('should return top recruiter stats (Emma wins) for selected period', async () => {
    prismaService.user.findMany = jest.fn().mockResolvedValue([
      {
        id: 'rec-1',
        name: 'Emma',
        email: 'emma@example.com',
        countryCode: '+91',
        mobileNumber: '9876543210',
        profileImage: 'https://example.com/emma.png',
      },
      {
        id: 'rec-2',
        name: 'Anu',
        email: 'anu@example.com',
        countryCode: '+91',
        mobileNumber: '9012345678',
        profileImage: 'https://example.com/anu.png',
      },
      {
        id: 'rec-3',
        name: 'Abhi',
        email: 'abhi@example.com',
        countryCode: '+91',
        mobileNumber: '9123456789',
        profileImage: 'https://example.com/abhi.png',
      },
    ]);

    // Emma values
    const emmaData = [
      ...Array.from({ length: 20 }, () => ({ currentProjectStatus: { statusName: 'nominated' } })),
      ...Array.from({ length: 10 }, () => ({ currentProjectStatus: { statusName: 'documents_verified' } })),
      ...Array.from({ length: 6 }, () => ({ currentProjectStatus: { statusName: 'interview_passed' } })),
      ...Array.from({ length: 4 }, () => ({ currentProjectStatus: { statusName: 'hired' } })),
    ];

    const anuData = [
      ...Array.from({ length: 80 }, () => ({ currentProjectStatus: { statusName: 'nominated' } })),
      ...Array.from({ length: 40 }, () => ({ currentProjectStatus: { statusName: 'documents_verified' } })),
      ...Array.from({ length: 30 }, () => ({ currentProjectStatus: { statusName: 'interview_passed' } })),
      ...Array.from({ length: 1 }, () => ({ currentProjectStatus: { statusName: 'hired' } })),
    ];

    const abhiData = [
      ...Array.from({ length: 100 }, () => ({ currentProjectStatus: { statusName: 'nominated' } })),
      ...Array.from({ length: 95 }, () => ({ currentProjectStatus: { statusName: 'documents_verified' } })),
      ...Array.from({ length: 30 }, () => ({ currentProjectStatus: { statusName: 'interview_passed' } })),
      ...Array.from({ length: 0 }, () => ({ currentProjectStatus: { statusName: 'hired' } })),
    ];

    prismaService.candidateProjects.findMany
      .mockResolvedValueOnce(emmaData)
      .mockResolvedValueOnce(anuData)
      .mockResolvedValueOnce(abhiData);

    const result = await service.getTopRecruiterStats(2026, 4, 1);

    expect(result).toEqual({
      success: true,
      data: {
        topRecruiter: {
          name: 'Emma',
          role: 'Affinks Recruiter',
          placementsThisMonth: 4,
          email: 'emma@example.com',
          phone: '+919876543210',
          avatarUrl: 'https://example.com/emma.png',
        },
        recruiterActivities: [
          { activity: 'Projects Assigned', value: 40 },
          { activity: 'Sent for Verification', value: 10 },
          { activity: 'Interviews Passed', value: 6 },
          { activity: 'Candidates Hired', value: 4 },
        ],
      },
      message: 'Top recruiter stats retrieved successfully',
    });
  });
});
