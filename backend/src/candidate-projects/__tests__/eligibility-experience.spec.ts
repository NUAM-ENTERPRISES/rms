import { Test, TestingModule } from '@nestjs/testing';
import { CandidateProjectsService } from '../candidate-projects.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { NotificationsService } from '../../notifications/notifications.service';
import { OutboxService } from '../../notifications/outbox.service';

const CANDIDATE_STATUS = {
  RNR: 'rnr',
};

describe('CandidateProjectsService - Eligibility Experience Logic', () => {
  let service: CandidateProjectsService;
  let prisma: any;

  const mockPrisma = {
    candidate: { findUnique: jest.fn(), findMany: jest.fn() },
    project: { findUnique: jest.fn() },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateProjectsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: {} },
        { provide: OutboxService, useValue: {} },
        { provide: NotificationsGateway, useValue: {} },
        {
          provide: 'CANDIDATE_STATUS',
          useValue: CANDIDATE_STATUS,
        },
      ],
    }).compile();

    service = module.get(CandidateProjectsService);
    prisma = module.get(PrismaService);
    
    // Global mock for constants if needed by the service
    (global as any).CANDIDATE_STATUS = CANDIDATE_STATUS;
  });

  it('should return a warning when total experience is met but specific role experience is not', async () => {
    const candidateId = 'abhi-id';
    const projectId = 'proj-id';
    const icuRoleId = 'icu-role-cat-id';
    const emergencyRoleId = 'emergency-role-cat-id';

    const mockCandidate = {
      id: candidateId,
      firstName: 'Abhi',
      lastName: 'Candidate',
      totalExperience: 6,
      dateOfBirth: '1995-01-01',
      workExperiences: [
        {
          startDate: '2020-01-01',
          endDate: '2023-01-01',
          roleCatalogId: emergencyRoleId, // 3 years Emergency
        },
        {
          startDate: '2023-01-01',
          endDate: '2026-01-01',
          roleCatalogId: icuRoleId, // 3 years ICU
        },
      ],
    };

    const mockProject = {
      id: projectId,
      title: 'ICU Project',
      rolesNeeded: [
        {
          id: 'role-1',
          designation: 'ICU Nurse',
          roleCatalogId: icuRoleId,
          minExperience: 5, // Requires 5 years total
          maxExperience: 10,
          minAge: 20,
          maxAge: 50,
          roleCatalog: { label: 'ICU Nurse' },
        },
      ],
    };

    prisma.candidate.findUnique.mockResolvedValue(mockCandidate);
    prisma.project.findUnique.mockResolvedValue(mockProject);

    const result = await service.checkEligibility(candidateId, projectId);
    console.log('Test 1 reasons:', result.roleEligibility[0].reasons);

    const icuEligibility = result.roleEligibility[0];
    
    // Total experience is 6, which is > 5 project requires, so hard eligibility should be true
    expect(icuEligibility.isEligible).toBe(true);
    
    // There should be a warning about specific experience
    const warning = icuEligibility.reasons.find(r => r.includes('Experience Warning'));
    expect(warning).toBeDefined();
    expect(warning).toContain('total experience, but only 3 years as ICU Nurse');
  });

  it('should fail eligibility if specific role does not match at all', async () => {
    const candidateId = 'abhi-id';
    const projectId = 'proj-id';
    const icuRoleId = 'icu-role-cat-id';
    const pediatricsRoleId = 'pediatrics-role-cat-id';

    const mockCandidate = {
      id: candidateId,
      firstName: 'Abhi',
      lastName: 'Candidate',
      totalExperience: 4,
      workExperiences: [
        {
          startDate: '2020-01-01',
          endDate: '2023-12-31',
          roleCatalogId: pediatricsRoleId, // 4 years Pediatrics
        },
      ],
    };

    const mockProject = {
      id: projectId,
      title: 'ICU Project',
      rolesNeeded: [
        {
          id: 'role-1',
          designation: 'ICU Nurse',
          roleCatalogId: icuRoleId,
          minExperience: 3,
          maxExperience: 10,
          minAge: 20,
          maxAge: 50,
          roleCatalog: { label: 'ICU Nurse' },
        },
      ],
    };

    prisma.candidate.findUnique.mockResolvedValue(mockCandidate);
    prisma.project.findUnique.mockResolvedValue(mockProject);

    const result = await service.checkEligibility(candidateId, projectId);

    const icuEligibility = result.roleEligibility[0];
    
    // Should be ineligible because NO ICU experience
    expect(icuEligibility.isEligible).toBe(false);
    expect(icuEligibility.reasons).toContain('Experience mismatch: Candidate has no recorded experience as ICU Nurse.');
  });
});
