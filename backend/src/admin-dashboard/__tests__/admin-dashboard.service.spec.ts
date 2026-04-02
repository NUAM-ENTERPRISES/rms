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

    const result = await service.getProjectRoleHiringStatus('proj-1');

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
          { activity: 'Documents Verified', value: 10 },
          { activity: 'Interviews Passed', value: 6 },
          { activity: 'Candidates Hired', value: 4 },
        ],
      },
      message: 'Top recruiter stats retrieved successfully',
    });
  });
});
