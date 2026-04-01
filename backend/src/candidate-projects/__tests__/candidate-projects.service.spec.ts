import { Test, TestingModule } from '@nestjs/testing';
import { CandidateProjectsService } from '../candidate-projects.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { NotificationsService } from '../../notifications/notifications.service';
import { OutboxService } from '../../notifications/outbox.service';
import { SendForInterviewDto } from '../dto/send-for-interview.dto';

describe('CandidateProjectsService - sendForInterview', () => {
  let service: CandidateProjectsService;
  let prisma: any;

  const mockPrisma = {
    candidate: { findUnique: jest.fn(), findMany: jest.fn() },
    project: { findUnique: jest.fn() },
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    role: { findUnique: jest.fn() },
    candidateProjectMainStatus: { findUnique: jest.fn() },
    candidateProjectSubStatus: { findUnique: jest.fn() },
    candidateProjects: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    candidateProjectStatusHistory: { findFirst: jest.fn(), create: jest.fn() },
    interviewStatusHistory: { create: jest.fn() },
    trainingAssignment: { create: jest.fn() },
    candidateRecruiterAssignment: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateProjectsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: { createNotification: jest.fn() } },
        { provide: OutboxService, useValue: { publishDataSync: jest.fn(), publishCandidateSentToScreening: jest.fn(), publishCandidateSentForVerification: jest.fn(), publishCandidateAssignedToScreening: jest.fn() } },
        { provide: NotificationsGateway, useValue: { emitToUser: jest.fn(), emitToUsers: jest.fn() } },
      ],
    }).compile();

    service = module.get(CandidateProjectsService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    (prisma.candidateRecruiterAssignment.findFirst as any).mockResolvedValue(null);
  });

  afterEach(() => jest.resetAllMocks());

  it('creates interviewStatusHistory when assigning mock interview', async () => {
    const dto = { projectId: 'p1', candidateId: 'c1', type: 'screening_assigned', notes: 'note' } as SendForInterviewDto;

    (prisma.candidate.findUnique as any).mockResolvedValue({ id: 'c1', firstName: 'A' });
    (prisma.project.findUnique as any).mockResolvedValue({ id: 'p1', title: 'P' });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', name: 'User 1' });
    (prisma.candidateProjectMainStatus.findUnique as any).mockResolvedValue({ id: 'ms1', label: 'Interview' });
    (prisma.candidateProjectSubStatus.findUnique as any).mockResolvedValue({ id: 'ss1', label: 'Mock Interview Assigned' });

    const existing = { id: 'map1', candidate: { firstName: 'A' }, project: { id: 'p1' } };

    const tx = {
      candidateProjects: {
        update: jest.fn().mockResolvedValue(existing),
        create: jest.fn().mockResolvedValue(existing),
      },
      candidateProjectStatusHistory: { create: jest.fn() },
      interviewStatusHistory: { create: jest.fn() },
      trainingAssignment: { create: jest.fn() },
    } as any;

    prisma.candidateProjects.findFirst.mockResolvedValue(existing);
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await service.sendForInterview(dto, 'u1');

    expect(tx.interviewStatusHistory.create).toHaveBeenCalled();
    expect(tx.interviewStatusHistory.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ interviewType: 'screening', status: 'assigned' }) }));
  });

  it('creates interviewStatusHistory when assigning client interview', async () => {
    const dto = { projectId: 'p1', candidateId: 'c1', type: 'interview_assigned', notes: 'note' } as SendForInterviewDto;

    (prisma.candidate.findUnique as any).mockResolvedValue({ id: 'c1', firstName: 'A' });
    (prisma.project.findUnique as any).mockResolvedValue({ id: 'p1', title: 'P' });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', name: 'User 1' });
    (prisma.candidateProjectMainStatus.findUnique as any).mockResolvedValue({ id: 'ms1', label: 'Interview' });
    (prisma.candidateProjectSubStatus.findUnique as any).mockResolvedValue({ id: 'ss2', label: 'Client Interview Assigned' });

    const existing = { id: 'map1', candidate: { firstName: 'A' }, project: { id: 'p1' } };

    const tx = {
      candidateProjects: {
        update: jest.fn().mockResolvedValue(existing),
        create: jest.fn().mockResolvedValue(existing),
      },
      candidateProjectStatusHistory: { create: jest.fn() },
      interviewStatusHistory: { create: jest.fn() },
      trainingAssignment: { create: jest.fn() },
    } as any;

    prisma.candidateProjects.findFirst.mockResolvedValue(existing);
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await service.sendForInterview(dto, 'u1');

    expect(tx.interviewStatusHistory.create).toHaveBeenCalled();
    expect(tx.interviewStatusHistory.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ interviewType: 'client', status: 'assigned' }) }));
  });

  it('sendForScreening creates candidate project status history and interview history', async () => {
    const dto = { projectId: 'p1', candidateId: 'c1', notes: 'note' } as any;

    (prisma.candidate.findUnique as any).mockResolvedValue({ id: 'c1', firstName: 'A' });
    (prisma.project.findUnique as any).mockResolvedValue({ id: 'p1', title: 'P', rolesNeeded: [], requiredScreening: true });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', name: 'User 1', userRoles: [{ role: { name: 'Interview Coordinator' } }] });
    (prisma.candidateProjectMainStatus.findUnique as any).mockResolvedValue({ id: 'ms1', label: 'Interview' });
    (prisma.candidateProjectSubStatus.findUnique as any).mockResolvedValue({ id: 'ss1', label: 'Screening Assigned' });

    const existing = { id: 'map1', candidate: { firstName: 'A' }, project: { id: 'p1' } };

    const tx = {
      candidateProjects: {
        update: jest.fn().mockResolvedValue(existing),
        create: jest.fn().mockResolvedValue(existing),
      },
      candidateProjectStatusHistory: { create: jest.fn() },
      interviewStatusHistory: { create: jest.fn() },
    } as any;

    prisma.candidateProjects.findFirst.mockResolvedValue(existing);
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    // mock outbox publish
    (service as any).outboxService = { publishCandidateSentToScreening: jest.fn() };

    await service.sendForScreening(dto, 'u1');

    expect(tx.candidateProjectStatusHistory.create).toHaveBeenCalled();
    expect(tx.interviewStatusHistory.create).toHaveBeenCalled();
    expect((service as any).outboxService.publishCandidateSentToScreening).toHaveBeenCalledWith(
      'map1',
      '',
      '',
      'u1',
      'u1',
    );
  });

  it('sendForScreening emits data sync only to assigned coordinator', async () => {
    const dto = { projectId: 'p1', candidateId: 'c1', coordinatorId: 'coord1', notes: 'note' } as any;

    (prisma.candidate.findUnique as any).mockResolvedValue({ id: 'c1', firstName: 'A' });
    (prisma.project.findUnique as any).mockResolvedValue({ id: 'p1', title: 'P', rolesNeeded: [], requiredScreening: true });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', name: 'User 1', userRoles: [{ role: { name: 'Interview Coordinator' } }] });
    (prisma.candidateProjectMainStatus.findUnique as any).mockResolvedValue({ id: 'ms1', label: 'Interview' });
    (prisma.candidateProjectSubStatus.findUnique as any).mockResolvedValue({ id: 'ss1', label: 'Screening Assigned' });

    const existing = { id: 'map1', candidate: { firstName: 'A' }, project: { id: 'p1' } };

    const tx = {
      candidateProjects: {
        update: jest.fn().mockResolvedValue(existing),
        create: jest.fn().mockResolvedValue(existing),
      },
      candidateProjectStatusHistory: { create: jest.fn() },
      interviewStatusHistory: { create: jest.fn() },
      screening: { create: jest.fn().mockResolvedValue({ id: 's1' }) },
    } as any;

    prisma.candidateProjects.findFirst.mockResolvedValue(existing);
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    (service as any).outboxService = { publishCandidateSentToScreening: jest.fn() };

    await service.sendForScreening(dto, 'u1');

    expect((service as any).notificationsGateway.emitToUsers).toHaveBeenCalledWith(
      expect.arrayContaining(['coord1']),
      'data:sync',
      expect.objectContaining({ type: 'Screening', id: 'map1' }),
    );
  });

  it('assignCandidateToProject notifies interview coordinators when screening required', async () => {
    const dto = { candidateId: 'c1', projectId: 'p1', notes: 'note' } as any;

    (prisma.candidate.findUnique as any).mockResolvedValue({ id: 'c1', firstName: 'John', lastName: 'Doe' });
    (prisma.project.findUnique as any).mockResolvedValue({ id: 'p1', title: 'Project P', rolesNeeded: [], requiredScreening: true });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', name: 'User 1' });
    (prisma.candidateProjectMainStatus.findUnique as any).mockResolvedValue({ id: 'ms1', label: 'Nominated' });
    (prisma.candidateProjectSubStatus.findUnique as any).mockResolvedValue({ id: 'ss1', label: 'Nominated Initial' });
    (prisma.user.findMany as any).mockResolvedValue([{ id: 'coord1' }, { id: 'coord2' }]);

    const tx = {
      candidateProjects: { create: jest.fn().mockResolvedValue({ id: 'map1' }) },
      candidateProjectStatusHistory: { create: jest.fn() },
    } as any;

    prisma.candidateProjects.findFirst.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await service.assignCandidateToProject(dto, 'u1');

    expect((service as any).notificationsService.createNotification).toHaveBeenCalledTimes(2);
    expect((service as any).notificationsService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'coord1',
        type: 'candidate_assigned_project',
        title: 'Project Screening Required',
        message: 'Project screening required: John Doe has been assigned to this project Project P. Please assign for screening.',
        link: '/projects/p1',
      }),
    );
  });

  it('sendForVerification blocks if candidate is already in screening/training status', async () => {
    const dto = { projectId: 'p1', candidateId: 'c1', notes: 'note' } as any;

    (prisma.candidate.findUnique as any).mockResolvedValue({ id: 'c1', firstName: 'A' });
    (prisma.project.findUnique as any).mockResolvedValue({ id: 'p1', title: 'P', rolesNeeded: [] });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', name: 'User 1' });
    (prisma.candidateProjectMainStatus.findUnique as any).mockResolvedValue({ id: 'ms1', label: 'Documents' });
    (prisma.candidateProjectSubStatus.findUnique as any).mockResolvedValue({ id: 'ss1', label: 'Verification In Progress' });

    const existing = { id: 'map1', candidateId: 'c1', candidate: { firstName: 'A' }, project: { id: 'p1' }, subStatus: { name: 'screening_assigned' } };
    prisma.candidateProjects.findFirst.mockResolvedValue(existing);

    await expect(service.sendForVerification(dto, 'u1')).rejects.toThrow('Candidate currently in screening/ng.training stage. Cannot send for verification.');
  });

  it('sendForVerification publishes outbox event for document verification', async () => {
    const dto = { projectId: 'p1', candidateId: 'c1', notes: 'note' } as any;

    (prisma.candidate.findUnique as any).mockResolvedValue({ id: 'c1', firstName: 'A' });
    (prisma.project.findUnique as any).mockResolvedValue({ id: 'p1', title: 'P', rolesNeeded: [] });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', name: 'User 1' });
    (prisma.candidateProjectMainStatus.findUnique as any).mockResolvedValue({ id: 'ms1', label: 'Documents' });
    (prisma.candidateProjectSubStatus.findUnique as any).mockResolvedValue({ id: 'ss1', label: 'Verification In Progress' });

    const existing = { id: 'map1', candidate: { firstName: 'A' }, project: { id: 'p1' } };

    const tx = {
      candidateProjects: {
        update: jest.fn().mockResolvedValue(existing),
        create: jest.fn().mockResolvedValue(existing),
      },
      candidateProjectStatusHistory: { create: jest.fn() },
    } as any;

    prisma.candidateProjects.findFirst.mockResolvedValue(existing);
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    (service as any).outboxService = { publishCandidateSentForVerification: jest.fn() };

    await service.sendForVerification(dto, 'u1');

    expect(tx.candidateProjectStatusHistory.create).toHaveBeenCalled();
    expect((service as any).outboxService.publishCandidateSentForVerification).toHaveBeenCalledWith('map1', '');
  });

  it('checkBulkEligibility marks RNR candidate as not eligible across all roles', async () => {
    (prisma.project.findUnique as any).mockResolvedValue({
      id: 'p1',
      title: 'P',
      rolesNeeded: [
        {
          id: 'r1',
          designation: 'Emergency Staff Nurse',
          genderRequirement: 'all',
          minAge: 18,
          maxAge: 70,
          minExperience: 0,
          maxExperience: null,
          roleCatalogId: null,
          minSalaryRange: null,
          maxSalaryRange: null,
          roleCatalog: null,
        },
      ],
      licensingExam: null,
      dataFlow: false,
      eligibility: false,
    });

    (prisma.candidate.findMany as any).mockResolvedValue([
      {
        id: 'c1',
        firstName: 'Brynne',
        lastName: 'Moore',
        dateOfBirth: '1990-01-01',
        gender: 'female',
        totalExperience: 1,
        currentStatus: { statusName: 'RNR' },
        workExperiences: [],
        preferredCountries: [],
      },
    ]);

    const result = await service.checkBulkEligibility({ projectId: 'p1', candidateIds: ['c1'] } as any);

    expect(result).toHaveLength(1);
    expect(result[0].candidateId).toBe('c1');
    expect(result[0].isEligible).toBe(false);
    expect(result[0].roleEligibility[0].isEligible).toBe(false);
    expect(result[0].roleEligibility[0].reasons).toContain(
      'Candidate is currently in Ringing No Response (RNR) status and cannot be assigned to a project.',
    );
  });
});
