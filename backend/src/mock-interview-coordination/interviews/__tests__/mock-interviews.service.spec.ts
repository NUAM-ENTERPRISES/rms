import { Test, TestingModule } from '@nestjs/testing';
import { MockInterviewsService } from '../mock-interviews.service';
import { PrismaService } from '../../../database/prisma.service';
import { CreateMockInterviewDto } from '../dto/create-mock-interview.dto';

describe('MockInterviewsService', () => {
  let service: MockInterviewsService;
  let prisma: any; // keep as any for jest mocks of Prisma client methods

  const mockPrisma = {
    candidateProjects: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    mockInterview: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    user: { findFirst: jest.fn(), findUnique: jest.fn() },
    roleCatalog: { findFirst: jest.fn().mockResolvedValue(null) },
    mockInterviewTemplate: { findUnique: jest.fn() },
    candidateProjectStatusHistory: { create: jest.fn(), findMany: jest.fn() },
    interviewStatusHistory: { create: jest.fn() },
    $transaction: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MockInterviewsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(MockInterviewsService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => {
    // Reset mocks between tests to avoid persistent mock implementations
    jest.resetAllMocks();
  });

  it('schedules a mock interview and updates subStatus to mock_interview_scheduled', async () => {
    const dto: CreateMockInterviewDto = {
      candidateProjectMapId: 'map1',
      coordinatorId: 'coord1',
      scheduledTime: '2025-12-01T10:00:00.000Z',
      duration: 60,
    } as any;

    // initial reads
    (prisma.candidateProjects.findUnique as any).mockResolvedValue({
      id: 'map1',
      subStatus: { name: 'mock_interview_assigned' },
    } as any);

    (prisma.mockInterview.findFirst as any).mockResolvedValue(null);

    (prisma.user.findFirst as any).mockResolvedValue({
      id: 'coord1',
      name: 'Coordinator',
      userRoles: [{ role: { name: 'Interview Coordinator' } }],
    } as any);

    // stub $transaction to capture tx calls
    const tx = {
      mockInterview: { create: jest.fn().mockResolvedValue({ id: 'mi1' }) },
      mockInterviewTemplate: { findUnique: jest.fn().mockResolvedValue(null) },
      roleCatalog: { findFirst: jest.fn().mockResolvedValue(null) },
      candidateProjects: { update: jest.fn().mockResolvedValue({ id: 'map1', subStatus: { id: 's2', name: 'mock_interview_scheduled' } }) },
      candidateProjectStatusHistory: { create: jest.fn().mockResolvedValue({ id: 'h1' }) },
      interviewStatusHistory: { create: jest.fn().mockResolvedValue({ id: 'h2' }) },
    } as any;

    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    // When create returns we call findOne(created.id) — ensure findUnique returns the created interview
    (prisma.mockInterview.findUnique as any).mockResolvedValue({
      id: 'mi1',
      candidateProjectMap: { id: 'map1', subStatus: { id: 's2', name: 'mock_interview_scheduled' } },
    });

    // call service
    await service.create(dto, 'user1');

    // transaction should be invoked and update subStatus to mock_interview_scheduled
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(tx.candidateProjects.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'map1' },
        data: { subStatus: { connect: { name: 'mock_interview_scheduled' } } },
      }),
    );

    // history entry created for the map
    expect(tx.candidateProjectStatusHistory.create).toHaveBeenCalled();
  });

  it('completes a mock interview and writes history with correct subStatusId', async () => {
    // make findOne return an existing interview (simulate not yet completed)
    (prisma.mockInterview.findUnique as any).mockResolvedValue({
      id: 'mi-complete',
      conductedAt: null,
      candidateProjectMapId: 'map1',
    });

    const dto = {
      overallRating: 4,
      decision: 'approved',
      checklistItems: [],
      remarks: 'Good',
      strengths: 'Skills',
      areasOfImprovement: 'None',
    } as any;

    // stub $transaction and tx methods
    const tx = {
      mockInterview: { update: jest.fn().mockResolvedValue({ id: 'mi-complete' }) },
      mockInterviewChecklistItem: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      candidateProjects: { update: jest.fn().mockResolvedValue({ id: 'map1', subStatus: { id: 's-pass', name: 'mock_interview_passed' } }) },
      candidateProjectStatusHistory: { create: jest.fn().mockResolvedValue({ id: 'hist1' }) },
      interviewStatusHistory: { create: jest.fn().mockResolvedValue({ id: 'h-int' }) },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'user1', name: 'User One' }) },
    } as any;

    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    // Call complete
    await service.complete('mi-complete', dto, 'user1');

    // Ensure candidateProjects update was attempted and status history record used the id
    expect(tx.candidateProjects.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'map1' },
        data: expect.any(Object),
      }),
    );

    // candidateProjectStatusHistory.create should include subStatusId that matches updated subStatus id
    expect(tx.candidateProjectStatusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subStatusId: 's-pass',
          subStatusSnapshot: 'mock_interview_passed',
        }),
      }),
    );
  });

  it('complete persists checklist items including numeric score', async () => {
    (prisma.mockInterview.findUnique as any).mockResolvedValueOnce({
      id: 'mi-score',
      conductedAt: null,
      candidateProjectMapId: 'map-score',
    });
    // subsequent findOne after complete() will call findUnique again to fetch the enriched interview
    (prisma.mockInterview.findUnique as any).mockResolvedValueOnce({
      id: 'mi-score',
      conductedAt: new Date(),
      template: { id: 'tpl-score' },
      candidateProjectMap: { id: 'map-score' },
    });

    const dto = {
      overallRating: 5,
      decision: 'approved',
      checklistItems: [
        { category: 'technical_skills', criterion: 'Test 1', passed: true, rating: 5, score: 95.5, notes: 'Nice' },
      ],
      remarks: 'Great',
      strengths: 'Good',
      areasOfImprovement: 'None',
    } as any;

    // stub $transaction and tx methods
    const tx = {
      mockInterview: { update: jest.fn().mockResolvedValue({ id: 'mi-score' }) },
      mockInterviewChecklistItem: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      candidateProjects: { update: jest.fn().mockResolvedValue({ id: 'map-score', subStatus: { id: 's-pass', name: 'mock_interview_passed' } }) },
      candidateProjectStatusHistory: { create: jest.fn().mockResolvedValue({ id: 'hist1' }) },
      interviewStatusHistory: { create: jest.fn().mockResolvedValue({ id: 'h-int' }) },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', name: 'User One' }) },
    } as any;

    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await service.complete('mi-score', dto, 'userX');

    expect(tx.mockInterviewChecklistItem.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ score: 95.5 }),
      ]),
    }));
  });

  it('complete handles missing userId without calling user.findUnique', async () => {
    (prisma.mockInterview.findUnique as any).mockResolvedValueOnce({
      id: 'mi-nouser',
      conductedAt: null,
      candidateProjectMapId: 'map-nouser',
    });
    // final findOne after complete
    (prisma.mockInterview.findUnique as any).mockResolvedValueOnce({
      id: 'mi-nouser',
      conductedAt: new Date(),
      candidateProjectMap: { id: 'map-nouser' },
    });

    const dto = {
      overallRating: 2,
      decision: 'needs_training',
      checklistItems: [],
      remarks: 'Missing user',
      strengths: 'N/A',
      areasOfImprovement: 'Practice',
    } as any;

    const tx = {
      mockInterview: { update: jest.fn().mockResolvedValue({ id: 'mi-nouser' }) },
      mockInterviewChecklistItem: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      candidateProjects: { update: jest.fn().mockResolvedValue({ id: 'map-nouser', subStatus: { id: 's-fail', name: 'mock_interview_failed' } }) },
      candidateProjectStatusHistory: { create: jest.fn().mockResolvedValue({ id: 'hist' }) },
      interviewStatusHistory: { create: jest.fn().mockResolvedValue({ id: 'hist2' }) },
      user: { findUnique: jest.fn() },
    } as any;

    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    // Call complete with undefined userId -- should not call tx.user.findUnique and should succeed
    await service.complete('mi-nouser', dto, undefined as any);

    expect(tx.user.findUnique).not.toHaveBeenCalled();
    expect(tx.interviewStatusHistory.create).toHaveBeenCalled();
  });

  it('findAll includes current map statuses (mainStatus/subStatus)', async () => {
    const query = { page: 1 } as any;
    // stub response
    (prisma.mockInterview.findMany as any).mockResolvedValue([]);

    await service.findAll(query);

    expect(prisma.mockInterview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          candidateProjectMap: expect.objectContaining({
            include: expect.objectContaining({ mainStatus: true, subStatus: true }),
          }),
        }),
      }),
    );
  });

  it('getAssignedCandidateProjects returns latest assigned maps with assignedAt', async () => {
    const query = { page: 1, limit: 10 } as any;

    // Prepare two history rows: newer one for map1 and older for map2
    const histories = [
      {
        id: 'h1',
        candidateProjectMapId: 'map1',
        statusChangedAt: new Date('2025-12-02T12:00:00.000Z'),
        candidateProjectMap: {
          id: 'map1',
          candidate: { id: 'c1', firstName: 'A', lastName: 'One', email: 'a@x' },
          project: { id: 'p1', title: 'Project 1' },
          roleNeeded: { id: 'r1', designation: 'RN' },
        },
        subStatus: { id: 's-assigned', name: 'mock_interview_assigned', label: 'Mock Interview Assigned' },
      },
      {
        id: 'h2',
        candidateProjectMapId: 'map2',
        statusChangedAt: new Date('2025-12-01T12:00:00.000Z'),
        candidateProjectMap: {
          id: 'map2',
          candidate: { id: 'c2', firstName: 'B', lastName: 'Two', email: 'b@x' },
          project: { id: 'p2', title: 'Project 2' },
          roleNeeded: { id: 'r2', designation: 'LPN' },
        },
        subStatus: { id: 's-assigned', name: 'mock_interview_assigned', label: 'Mock Interview Assigned' },
      },
    ];

    // mock candidateProjects.findMany/count to return current assigned maps
    const maps = [
      {
        id: 'map1',
        candidate: { id: 'c1', firstName: 'A', lastName: 'One', email: 'a@x' },
        project: { id: 'p1', title: 'Project 1' },
        roleNeeded: { id: 'r1', designation: 'RN' },
        recruiter: { id: 'u1', name: 'Rec A', email: 'rec@a' },
        mainStatus: { id: 'm1', name: 'interview' },
        subStatus: { id: 's-assigned', name: 'mock_interview_assigned' },
        assignedAt: new Date('2025-12-02T12:00:00.000Z'),
      },
      {
        id: 'map2',
        candidate: { id: 'c2', firstName: 'B', lastName: 'Two', email: 'b@x' },
        project: { id: 'p2', title: 'Project 2' },
        roleNeeded: { id: 'r2', designation: 'LPN' },
        recruiter: { id: 'u2', name: 'Rec B', email: 'rec@b' },
        mainStatus: { id: 'm1', name: 'interview' },
        subStatus: { id: 's-assigned', name: 'mock_interview_assigned' },
        assignedAt: new Date('2025-12-01T12:00:00.000Z'),
      },
    ];

    (prisma.candidateProjects.count as any).mockResolvedValue(2);
    (prisma.candidateProjects.findMany as any).mockResolvedValue(maps);

    const res: any = await service.getAssignedCandidateProjects(query);

    // Ensure the candidateProjects query was executed
    expect(prisma.candidateProjects.findMany).toHaveBeenCalled();

    // Should return items in order of latest first
    expect(res.success).toBe(true);
    expect(res.data.items.length).toBe(2);
    expect(res.data.items[0].id).toBe('map1');
    expect(res.data.items[0].assignedAt).toBeDefined();
    expect(res.data.items[1].id).toBe('map2');
  });

  it('getUpcoming returns all scheduled interviews and marks expired items', async () => {
    const query = { page: 1, limit: 10 } as any;

    // Create two mock interviews: one in past, one in future
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const past = {
      id: 'past1',
      status: 'scheduled',
      scheduledTime: new Date(pastDate),
      candidateProjectMap: { id: 'map-past' },
    } as any;

    const future = {
      id: 'future1',
      status: 'scheduled',
      scheduledTime: new Date(futureDate),
      candidateProjectMap: { id: 'map-future' },
    } as any;

    (prisma.mockInterview.count as any).mockResolvedValue(2);
    (prisma.mockInterview.findMany as any).mockResolvedValue([past, future]);

    const res: any = await service.getUpcoming(query);

    expect(prisma.mockInterview.findMany).toHaveBeenCalled();
    expect(res.data.items.length).toBe(2);
    // Past scheduled time should be marked as expired
    const foundPast = res.data.items.find((it: any) => it.id === 'past1');
    const foundFuture = res.data.items.find((it: any) => it.id === 'future1');
    expect(foundPast.isExpired).toBe(true);
    expect(foundFuture.isExpired).toBe(false);
  });

  it('findOne returns candidate with combined phone (countryCode + mobileNumber) and coordinator object', async () => {
    const interviewId = 'mi-find1';
    (prisma.mockInterview.findUnique as any).mockResolvedValueOnce({
      id: interviewId,
      coordinatorId: 'coord1',
      candidateProjectMap: {
        id: 'map-c1',
        candidate: {
          id: 'c1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          countryCode: '+91',
          mobileNumber: '9876543210',
        },
      },
    });

    // Make user.findUnique return coordinator name
    (prisma.user.findUnique as any).mockResolvedValueOnce({ id: 'coord1', name: 'Coordinator Name' });

    const res: any = await service.findOne(interviewId);

    expect(prisma.mockInterview.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: interviewId } }),
    );

    expect(res.candidateProjectMap).toBeDefined();
    expect(res.candidateProjectMap.candidate).toBeDefined();
    // Expect phone field with a space between country code and number
    expect(res.candidateProjectMap.candidate.phone).toBe('+91 9876543210');
    // Expect coordinator object is returned
    expect(res.coordinator).toEqual({ id: 'coord1', name: 'Coordinator Name' });
  });

  it('updateTemplate successfully updates the interview templateId', async () => {
    const interviewId = 'mi-t1';
    // findOne (initial) returns existing interview not completed
    (prisma.mockInterview.findUnique as any).mockResolvedValueOnce({
      id: interviewId,
      conductedAt: null,
      candidateProjectMapId: 'map1',
      candidateProjectMap: { id: 'map1', roleNeeded: { designation: 'RN' } },
    });

    // template exists and matches role
    (prisma.mockInterviewTemplate.findUnique as any).mockResolvedValueOnce({ id: 'tpl1', roleId: 'rc1' });
    (prisma.roleCatalog.findFirst as any).mockResolvedValue({ id: 'rc1' });

    // update should succeed
    (prisma.mockInterview.update as any).mockResolvedValue({ id: interviewId, templateId: 'tpl1' });

    // final findOne returns enriched interview including template
    (prisma.mockInterview.findUnique as any).mockResolvedValueOnce({
      id: interviewId,
      conductedAt: null,
      template: { id: 'tpl1' },
      candidateProjectMap: { id: 'map1', roleNeeded: { designation: 'RN' } },
    });

    const res = await service.updateTemplate(interviewId, 'tpl1');

    expect(prisma.mockInterview.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: interviewId }, data: { templateId: 'tpl1' } }));
    expect(res).toBeDefined();
    expect(res.template).toBeDefined();
    expect((res as any).template.id).toBe('tpl1');
  });

  it('updateTemplate throws when interview already completed', async () => {
    const interviewId = 'mi-completed';
    (prisma.mockInterview.findUnique as any).mockResolvedValueOnce({ id: interviewId, conductedAt: new Date() });

    await expect(service.updateTemplate(interviewId, 'tplX')).rejects.toThrow('Cannot change template for a completed mock interview');
  });

  it('updateTemplate throws NotFound if template does not exist', async () => {
    const interviewId = 'mi-t2';
    // Ensure findOne resolves for this interview (use persistent mock for this case)
    (prisma.mockInterview.findUnique as any).mockResolvedValue({ id: interviewId, conductedAt: null, candidateProjectMap: { roleNeeded: { designation: 'RN' } } });
    // ensure findOne later calls (if any) won't accidentally return undefined
    (prisma.mockInterview.findUnique as any).mockResolvedValueOnce({ id: interviewId, conductedAt: null, candidateProjectMap: { roleNeeded: { designation: 'RN' } } });
    (prisma.mockInterviewTemplate.findUnique as any).mockResolvedValueOnce(null);

    await expect(service.updateTemplate(interviewId, 'missing-tpl')).rejects.toThrow('Template with ID "missing-tpl" not found');
  });

  it('updateTemplate throws when template role does not match candidate role', async () => {
    const interviewId = 'mi-t3';
    // Stub service.findOne directly so test is focused on template/role validation
    (service as any).findOne = jest.fn().mockResolvedValueOnce({ id: interviewId, conductedAt: null, candidateProjectMap: { roleNeeded: { designation: 'RN' } } } as any);
    (prisma.mockInterviewTemplate.findUnique as any).mockResolvedValue({ id: 'tpl2', roleId: 'rc-mismatch' });
    // Return a role id that doesn't match template.roleId so we trigger role mismatch
    (prisma.roleCatalog.findFirst as any).mockResolvedValue({ id: 'rc-different' });

    await expect(service.updateTemplate(interviewId, 'tpl2')).rejects.toThrow('Template role does not match candidate role');
  });
});
