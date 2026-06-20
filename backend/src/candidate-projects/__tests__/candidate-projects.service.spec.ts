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
    candidateProjects: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), create: jest.fn() },
    candidateProjectStatusHistory: { findFirst: jest.fn(), create: jest.fn() },
    interviewStatusHistory: { create: jest.fn() },
    screeningTraining: { create: jest.fn() },
    candidateRecruiterAssignment: { findFirst: jest.fn() },
    candidateProjectDocumentVerification: { findFirst: jest.fn() },
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

  beforeEach(() => {
    (prisma.candidateProjects.findMany as any).mockResolvedValue([]);
  });

  it('creates interviewStatusHistory when assigning mock interview', async () => {
    const dto = { projectId: 'p1', candidateId: 'c1', type: 'screening_assigned', notes: 'note' } as SendForInterviewDto;

    (prisma.candidate.findUnique as any).mockResolvedValue({ id: 'c1', firstName: 'A' });
    (prisma.project.findUnique as any).mockResolvedValue({ id: 'p1', title: 'P', status: 'IN_PROGRESS' });
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
      screeningTraining: { create: jest.fn() },
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
    (prisma.project.findUnique as any).mockResolvedValue({ id: 'p1', title: 'P', status: 'IN_PROGRESS' });
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
      screeningTraining: { create: jest.fn() },
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
    (prisma.project.findUnique as any).mockResolvedValue({ id: 'p1', title: 'P', status: 'IN_PROGRESS', rolesNeeded: [], requiredScreening: true });
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
    (prisma.project.findUnique as any).mockResolvedValue({ id: 'p1', title: 'P', status: 'IN_PROGRESS', rolesNeeded: [], requiredScreening: true });
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

    (prisma.candidate.findUnique as any).mockResolvedValue({
      id: 'c1',
      firstName: 'John',
      lastName: 'Doe',
      currentStatus: { statusName: 'interested' },
    });
    (prisma.project.findUnique as any).mockResolvedValue({ id: 'p1', title: 'Project P', status: 'IN_PROGRESS', rolesNeeded: [], requiredScreening: true });
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

  it('assignCandidateToProject blocks non-positive candidate from assignment', async () => {
    const dto = { candidateId: 'c1', projectId: 'p1', notes: 'note' } as any;

    (prisma.candidate.findUnique as any).mockResolvedValue({
      id: 'c1',
      firstName: 'John',
      lastName: 'Doe',
      currentStatus: { statusName: 'not_interested' },
    });
    (prisma.project.findUnique as any).mockResolvedValue({
      id: 'p1',
      title: 'Project P',
      status: 'IN_PROGRESS',
      rolesNeeded: [],
      requiredScreening: false,
    });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', name: 'User 1' });

    await expect(service.assignCandidateToProject(dto, 'u1')).rejects.toThrow(
      'Candidate must be in a positive status',
    );
  });

  it('assignCandidateToProject blocks when processing is in progress on another project', async () => {
    const dto = { candidateId: 'c1', projectId: 'p1', notes: 'note' } as any;

    (prisma.candidate.findUnique as any).mockResolvedValue({
      id: 'c1',
      firstName: 'John',
      lastName: 'Doe',
      currentStatus: { statusName: 'interested' },
    });
    (prisma.candidateProjects.findFirst as any).mockImplementation(async (args: any) => {
      if (args?.where?.subStatus?.name?.in) {
        return {
          candidateId: 'c1',
          project: { id: 'p-other', title: 'Hospital Riyadh' },
        };
      }
      return null;
    });

    await expect(service.assignCandidateToProject(dto, 'u1')).rejects.toThrow(
      'being processed on "Hospital Riyadh"',
    );
  });

  it('assignCandidateToProject allows assignment when other project is processing_hold', async () => {
    const dto = { candidateId: 'c1', projectId: 'p1', notes: 'note' } as any;

    (prisma.candidate.findUnique as any).mockResolvedValue({
      id: 'c1',
      firstName: 'John',
      lastName: 'Doe',
      currentStatus: { statusName: 'interested' },
    });
    (prisma.project.findUnique as any).mockResolvedValue({
      id: 'p1',
      title: 'Project P',
      status: 'IN_PROGRESS',
      rolesNeeded: [],
      requiredScreening: false,
    });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', name: 'User 1' });
    (prisma.candidateProjectMainStatus.findUnique as any).mockResolvedValue({ id: 'ms1', label: 'Nominated' });
    (prisma.candidateProjectSubStatus.findUnique as any).mockResolvedValue({ id: 'ss1', label: 'Nominated Initial' });

    (prisma.candidateProjects.findFirst as any).mockResolvedValue(null);

    const tx = {
      candidateProjects: { create: jest.fn().mockResolvedValue({ id: 'map1' }) },
      candidateProjectStatusHistory: { create: jest.fn() },
    } as any;

    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await service.assignCandidateToProject(dto, 'u1');

    expect(tx.candidateProjects.create).toHaveBeenCalled();
  });

  it('sendForVerification blocks when processing is in progress on another project', async () => {
    const dto = { projectId: 'p1', candidateId: 'c1', notes: 'note' } as any;

    (prisma.candidate.findUnique as any).mockResolvedValue({ id: 'c1', firstName: 'A' });
    (prisma.project.findUnique as any).mockResolvedValue({
      id: 'p1',
      title: 'ICU Dubai',
      status: 'IN_PROGRESS',
      rolesNeeded: [],
    });
    (prisma.candidateProjects.findFirst as any).mockImplementation(async (args: any) => {
      if (args?.where?.subStatus?.name?.in) {
        return {
          candidateId: 'c1',
          project: { id: 'p-other', title: 'Hospital Riyadh' },
        };
      }
      return null;
    });

    await expect(service.sendForVerification(dto, 'u1')).rejects.toThrow(
      'Pipeline is paused here because this candidate has Processing In Progress on "Hospital Riyadh"',
    );
  });

  it('sendForVerification blocks when introduction video is required but missing', async () => {
    const dto = { projectId: 'p1', candidateId: 'c1', notes: 'note' } as any;

    (prisma.candidate.findUnique as any).mockResolvedValue({ id: 'c1', firstName: 'A' });
    (prisma.project.findUnique as any).mockResolvedValue({
      id: 'p1',
      title: 'P',
      status: 'IN_PROGRESS',
      rolesNeeded: [],
      introductionVideoRequired: true,
    });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', name: 'User 1' });
    (prisma.candidateProjectMainStatus.findUnique as any).mockResolvedValue({ id: 'ms1', label: 'Documents' });
    (prisma.candidateProjectSubStatus.findUnique as any).mockResolvedValue({ id: 'ss1', label: 'Verification In Progress' });

    const existing = {
      id: 'map1',
      candidateId: 'c1',
      projectId: 'p1',
      roleNeededId: null,
      subStatus: { name: 'nominated' },
    };
    prisma.candidateProjects.findFirst.mockResolvedValue(existing);
    prisma.candidateProjectDocumentVerification.findFirst.mockResolvedValue(null);

    await expect(service.sendForVerification(dto, 'u1')).rejects.toThrow(
      'Introduction video is required before sending for verification',
    );
  });

  it('sendForVerification blocks if candidate is already in screening/training status', async () => {
    const dto = { projectId: 'p1', candidateId: 'c1', notes: 'note' } as any;

    (prisma.candidate.findUnique as any).mockResolvedValue({ id: 'c1', firstName: 'A' });
    (prisma.project.findUnique as any).mockResolvedValue({
      id: 'p1',
      title: 'P',
      status: 'IN_PROGRESS',
      rolesNeeded: [],
    });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', name: 'User 1' });
    (prisma.candidateProjectMainStatus.findUnique as any).mockResolvedValue({ id: 'ms1', label: 'Documents' });
    (prisma.candidateProjectSubStatus.findUnique as any).mockResolvedValue({ id: 'ss1', label: 'Verification In Progress' });

    const existing = { id: 'map1', candidateId: 'c1', candidate: { firstName: 'A' }, project: { id: 'p1' }, subStatus: { name: 'screening_assigned' } };
    prisma.candidateProjects.findFirst.mockResolvedValue(existing);

    await expect(service.sendForVerification(dto, 'u1')).rejects.toThrow('Candidate currently in screening/ng.training stage. Cannot send for verification.');
  });

  it('sendForVerification blocks when project is not in progress', async () => {
    const dto = { projectId: 'p1', candidateId: 'c1', notes: 'note' } as any;

    (prisma.candidate.findUnique as any).mockResolvedValue({ id: 'c1', firstName: 'A' });
    (prisma.project.findUnique as any).mockResolvedValue({
      id: 'p1',
      title: 'P',
      status: 'COMPLETED',
      rolesNeeded: [],
    });

    await expect(service.sendForVerification(dto, 'u1')).rejects.toThrow(
      'Cannot assign candidates to a project with status "COMPLETED".',
    );
  });

  it('sendForVerification publishes outbox event for document verification', async () => {
    const dto = { projectId: 'p1', candidateId: 'c1', notes: 'note' } as any;

    (prisma.candidate.findUnique as any).mockResolvedValue({ id: 'c1', firstName: 'A' });
    (prisma.project.findUnique as any).mockResolvedValue({
      id: 'p1',
      title: 'P',
      status: 'IN_PROGRESS',
      rolesNeeded: [],
    });
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

  it('checkBulkEligibility marks non-positive candidate as not eligible across all roles', async () => {
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
        currentStatus: { statusName: 'not_interested' },
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
      'Candidate must be in a positive status (interested, future, or on_hold) to be assigned to a project.',
    );
  });

  it('checkBulkEligibility marks candidate blocked when processing is in progress on another project', async () => {
    (prisma.project.findUnique as any).mockResolvedValue({
      id: 'p1',
      title: 'ICU Dubai',
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
      country: null,
    });

    (prisma.candidate.findMany as any).mockResolvedValue([
      {
        id: 'c1',
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        gender: 'female',
        totalExperience: 1,
        currentStatus: { statusName: 'interested' },
        workExperiences: [],
        preferredCountries: [],
      },
    ]);

    (prisma.candidateProjects.findMany as any).mockImplementation(async (args: any) => {
      if (args?.where?.subStatus?.name?.in) {
        return [
          {
            candidateId: 'c1',
            project: { id: 'p-other', title: 'Hospital Riyadh' },
          },
        ];
      }
      return [];
    });

    const result = await service.checkBulkEligibility({
      projectId: 'p1',
      candidateIds: ['c1'],
    } as any);

    expect(result).toHaveLength(1);
    expect(result[0].isEligible).toBe(false);
    expect(result[0].pipelineBlockedOnThisProject).toBe(true);
    expect(result[0].processingConflict).toEqual({
      projectId: 'p-other',
      projectTitle: 'Hospital Riyadh',
    });
    expect(result[0].roleEligibility[0].reasons).toContain(
      'This candidate is being processed on "Hospital Riyadh".',
    );
  });
});

describe('CandidateProjectsService - status change requests', () => {
  let service: CandidateProjectsService;
  let prisma: any;
  let outboxService: any;

  const mockPrisma = {
    candidateProjects: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    candidateProjectStatusChangeRequest: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    candidateProjectMainStatus: { findUnique: jest.fn() },
    candidateProjectSubStatus: { findUnique: jest.fn() },
    candidateProjectStatusHistory: { create: jest.fn() },
    user: { findUnique: jest.fn() },
    candidateRecruiterAssignment: { findFirst: jest.fn() },
    candidate: { findUnique: jest.fn() },
    project: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  } as any;

  beforeEach(async () => {
    outboxService = {
      publishCandidateProjectStatusChangeRequested: jest.fn(),
      publishCandidateProjectStatusChangeReviewed: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateProjectsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: { createNotification: jest.fn() } },
        { provide: OutboxService, useValue: outboxService },
        { provide: NotificationsGateway, useValue: { emitToUser: jest.fn() } },
      ],
    }).compile();

    service = module.get(CandidateProjectsService);
    prisma = module.get(PrismaService);
    (prisma.candidateRecruiterAssignment.findFirst as any).mockResolvedValue(null);
  });

  afterEach(() => jest.resetAllMocks());

  it('creates a pending status change request', async () => {
    prisma.candidateProjects.findUnique.mockResolvedValue({
      id: 'map1',
      candidateId: 'c1',
      projectId: 'p1',
      mainStatus: { name: 'documents' },
      candidate: { id: 'c1', firstName: 'Jane', lastName: 'Doe' },
      project: { id: 'p1', title: 'Project A' },
    });
    prisma.candidateProjectStatusChangeRequest.findFirst.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      name: 'Recruiter One',
      userRoles: [{ role: { name: 'Recruiter' } }],
    });

    const tx = {
      candidateProjectStatusChangeRequest: {
        create: jest.fn().mockResolvedValue({
          id: 'req1',
          requestedStatus: 'withdrawn',
          reason: 'Candidate declined offer',
          status: 'pending',
        }),
      },
    };
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const result = await service.createStatusChangeRequest(
      'map1',
      {
        candidateProjectMapId: 'map1',
        requestType: 'block',
        requestedStatus: 'withdrawn',
        reason: 'Candidate declined offer',
      },
      'u1',
    );

    expect(result.id).toBe('req1');
    expect(outboxService.publishCandidateProjectStatusChangeRequested).toHaveBeenCalled();
  });

  it('applies status directly for manager without approval workflow', async () => {
    prisma.candidateProjects.findUnique.mockResolvedValue({
      id: 'map1',
      candidateId: 'c1',
      projectId: 'p1',
      mainStatus: { name: 'documents' },
      candidate: { id: 'c1', firstName: 'Jane', lastName: 'Doe' },
      project: { id: 'p1', title: 'Project A' },
    });
    prisma.candidateProjectStatusChangeRequest.findFirst.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({
      id: 'mgr1',
      name: 'Manager One',
      userRoles: [{ role: { name: 'Manager' } }],
    });
    const tx = {
      candidateProjectStatusChangeRequest: {
        create: jest.fn().mockResolvedValue({
          id: 'req-direct',
          requestedStatus: 'withdrawn',
          reason: 'Candidate declined offer',
          status: 'approved',
          reviewedBy: 'mgr1',
        }),
      },
      candidateProjects: {
        findUnique: jest.fn().mockResolvedValue({ id: 'map1', candidateId: 'c1' }),
        update: jest.fn().mockResolvedValue({
          id: 'map1',
          candidate: { id: 'c1' },
          project: { id: 'p1' },
          roleNeeded: null,
          recruiter: null,
          mainStatus: { id: 'ms1', label: 'Withdrawn' },
          subStatus: { id: 'ss1', label: 'Withdrawn' },
        }),
      },
      candidateProjectSubStatus: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'ss-withdrawn',
          name: 'withdrawn',
          label: 'Withdrawn',
          stage: { id: 'ms1', label: 'Withdrawn' },
        }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ name: 'Manager One' }),
      },
      candidateProjectStatusHistory: {
        create: jest.fn().mockResolvedValue({ id: 'h1' }),
      },
    };
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const result = await service.createStatusChangeRequest(
      'map1',
      {
        candidateProjectMapId: 'map1',
        requestType: 'block',
        requestedStatus: 'withdrawn',
        reason: 'Candidate declined offer',
      },
      'mgr1',
    );

    expect(result.status).toBe('approved');
    expect(outboxService.publishCandidateProjectStatusChangeRequested).not.toHaveBeenCalled();
  });

  it('blocks duplicate pending requests', async () => {
    prisma.candidateProjects.findUnique.mockResolvedValue({
      id: 'map1',
      mainStatus: { name: 'documents' },
      candidate: { firstName: 'Jane', lastName: 'Doe' },
      project: { title: 'Project A' },
    });
    prisma.candidateProjectStatusChangeRequest.findFirst.mockResolvedValue({ id: 'existing' });

    await expect(
      service.createStatusChangeRequest(
        'map1',
        {
          candidateProjectMapId: 'map1',
          requestType: 'block',
          requestedStatus: 'on_hold',
          reason: 'Waiting for documents from candidate',
        },
        'u1',
      ),
    ).rejects.toThrow('pending status change request already exists');
  });

  it('sendForVerification blocks when candidate project is on hold', async () => {
    const dto = { projectId: 'p1', candidateId: 'c1', notes: 'note' } as any;

    prisma.candidate.findUnique.mockResolvedValue({ id: 'c1', firstName: 'A' });
    prisma.project.findUnique.mockResolvedValue({
      id: 'p1',
      title: 'P',
      status: 'IN_PROGRESS',
      rolesNeeded: [],
    });
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', name: 'User 1' });
    prisma.candidateProjectMainStatus.findUnique.mockResolvedValue({ id: 'ms1', label: 'Documents' });
    prisma.candidateProjectSubStatus.findUnique.mockResolvedValue({ id: 'ss1', label: 'On Hold' });

    prisma.candidateProjects.findFirst.mockResolvedValue({
      id: 'map1',
      mainStatus: { name: 'on_hold' },
      subStatus: { name: 'on_hold' },
    });

    await expect(service.sendForVerification(dto, 'u1')).rejects.toThrow(
      "currently On Hold",
    );
  });
});
