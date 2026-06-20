import { Test, TestingModule } from '@nestjs/testing';
import { RecruiterAssignmentService } from '../recruiter-assignment.service';
import { PrismaService } from '../../../database/prisma.service';
import { OutboxService } from '../../../notifications/outbox.service';
import { RolesService } from '../../../roles/roles.service';
import { CandidateListFilterService } from '../candidate-list-filter.service';
import { ROLE_NAMES } from '../../../common/constants/role-ids';
import { LanguageProficiency, UserAccountStatus } from '@prisma/client';

describe('RecruiterAssignmentService', () => {
  let service: RecruiterAssignmentService;

  const recruiterRoleId = 'role-recruiter';

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    candidate: {
      findUnique: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    systemConfig: {
      findUnique: jest.fn(),
    },
    language: {
      findMany: jest.fn(),
    },
    candidateStatus: {
      findFirst: jest.fn(),
    },
    candidateRecruiterAssignment: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockOutboxService = {
    publishCandidateRecruiterAssigned: jest.fn(),
  };

  const mockRolesService = {
    findIdByName: jest.fn(),
  };

  const mockCandidateListFilterService = {};

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRolesService.findIdByName.mockImplementation(async (name: string) => {
      if (name === ROLE_NAMES.RECRUITER) return recruiterRoleId;
      return 'other-role';
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecruiterAssignmentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OutboxService, useValue: mockOutboxService },
        { provide: RolesService, useValue: mockRolesService },
        {
          provide: CandidateListFilterService,
          useValue: mockCandidateListFilterService,
        },
      ],
    }).compile();

    service = module.get<RecruiterAssignmentService>(RecruiterAssignmentService);
  });

  const coordinatorLikeUser = {
    id: 'user-cc',
    name: 'Alex Coordinator',
    email: 'cc@test.com',
    mobileNumber: '9876543210',
    countryCode: '+91',
    userRoles: [{ roleId: 'role-cc', role: { name: ROLE_NAMES.AGENT_COORDINATOR } }],
  };

  const nurseProfessionTypeId = 'pt_nurse_seed001';

  const recruiterUser = {
    id: 'user-rec',
    name: 'Recruiter Ron',
    email: 'rec@test.com',
    mobileNumber: '9876543211',
    countryCode: '+91',
    userRoles: [{ roleId: recruiterRoleId, role: { name: 'Recruiter' } }],
    userProfessionScopes: [{ professionTypeId: nurseProfessionTypeId }],
  };

  describe('getBestRecruiterForAssignment', () => {
    it('assigns directly to creator when creator is Recruiter with matching profession coverage', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(recruiterUser);
      mockPrismaService.candidate.findUnique.mockResolvedValue({
        professionTypeId: nurseProfessionTypeId,
      });

      const result = await service.getBestRecruiterForAssignment(
        'cand-1',
        'user-rec',
      );

      expect(result.isRoundRobin).toBe(false);
      expect(result.directAssignmentKind).toBe('recruiter');
      expect(result.id).toBe('user-rec');
    });

    it('uses round-robin when creator is Recruiter without matching profession coverage', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(recruiterUser);
      mockPrismaService.candidate.findUnique
        .mockResolvedValueOnce({ professionTypeId: 'pt_doctor_seed01' })
        .mockResolvedValueOnce({ source: 'manual' })
        .mockResolvedValue({ professionTypeId: 'pt_doctor_seed01' });
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: 'user-doctor-rec',
          name: 'Doctor Recruiter',
          email: 'dr@test.com',
          mobileNumber: '111',
          countryCode: '+1',
          candidateRecruiterAssignments: [],
        },
      ]);

      const result = await service.getBestRecruiterForAssignment(
        'cand-doctor',
        'user-rec',
      );

      expect(result.isRoundRobin).toBe(true);
      expect(result.id).toBe('user-doctor-rec');
    });

    it('assigns directly to creator when candidate source is agent (non-recruiter)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(coordinatorLikeUser);
      mockPrismaService.candidate.findUnique.mockResolvedValue({
        source: 'agent',
      });

      const result = await service.getBestRecruiterForAssignment(
        'cand-agent',
        'user-cc',
      );

      expect(result.isRoundRobin).toBe(false);
      expect(result.directAssignmentKind).toBe('agent_source');
      expect(result.id).toBe('user-cc');
      expect(mockPrismaService.user.findMany).not.toHaveBeenCalled();
    });

    it('treats legacy source agents as agent', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(coordinatorLikeUser);
      mockPrismaService.candidate.findUnique.mockResolvedValue({
        source: 'agents',
      });

      const result = await service.getBestRecruiterForAssignment(
        'cand-legacy',
        'user-cc',
      );

      expect(result.isRoundRobin).toBe(false);
      expect(result.directAssignmentKind).toBe('agent_source');
      expect(result.id).toBe('user-cc');
    });

    it('uses round-robin when source is manual and creator is not Recruiter', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(coordinatorLikeUser);
      mockPrismaService.candidate.findUnique.mockResolvedValue({
        source: 'manual',
        professionTypeId: nurseProfessionTypeId,
      });
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: 'user-load',
          name: 'Least Busy',
          email: 'lb@test.com',
          mobileNumber: '111',
          countryCode: '+1',
          candidateRecruiterAssignments: [],
        },
        {
          id: 'user-busy',
          name: 'Busy Bee',
          email: 'bb@test.com',
          mobileNumber: '222',
          countryCode: '+1',
          candidateRecruiterAssignments: [{}],
        },
      ]);

      const result = await service.getBestRecruiterForAssignment(
        'cand-manual',
        'user-cc',
      );

      expect(result.isRoundRobin).toBe(true);
      expect(result.id).toBe('user-load');
      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
    });
  });

  describe('getRecruiterWithLanguageAwareRoundRobin', () => {
    const recruitersBase = {
      email: 'r@test.com',
      mobileNumber: '1',
      countryCode: '+1',
    };

    beforeEach(() => {
      mockPrismaService.candidate.findUnique.mockResolvedValue({
        addressState: { code: 'KL' },
        professionTypeId: nurseProfessionTypeId,
      });
      mockPrismaService.systemConfig.findUnique.mockResolvedValue({
        value: { KL: ['ml'] },
      });
      mockPrismaService.language.findMany.mockResolvedValue([{ code: 'ml' }]);
    });

    it('prefers higher proficiency tier when several recruiters speak the target language', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: 'ra',
          name: 'Secondary only',
          ...recruitersBase,
          candidateRecruiterAssignments: [],
          userLanguages: [
            { languageCode: 'ml', proficiency: LanguageProficiency.SECONDARY },
          ],
        },
        {
          id: 'rb',
          name: 'Primary',
          ...recruitersBase,
          candidateRecruiterAssignments: [],
          userLanguages: [
            { languageCode: 'ml', proficiency: LanguageProficiency.PRIMARY },
          ],
        },
      ]);

      const result = await service.getRecruiterWithLanguageAwareRoundRobin(
        'cand-1',
      );

      expect(result.id).toBe('rb');
    });

    it('breaks tier ties by least active assignment count', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: 'rbusy',
          name: 'Busy Primary',
          ...recruitersBase,
          candidateRecruiterAssignments: [{}],
          userLanguages: [
            { languageCode: 'ml', proficiency: LanguageProficiency.PRIMARY },
          ],
        },
        {
          id: 'rfree',
          name: 'Free Primary',
          ...recruitersBase,
          candidateRecruiterAssignments: [],
          userLanguages: [
            { languageCode: 'ml', proficiency: LanguageProficiency.PRIMARY },
          ],
        },
      ]);

      const result = await service.getRecruiterWithLanguageAwareRoundRobin(
        'cand-2',
      );

      expect(result.id).toBe('rfree');
    });

    it('uses first ordered language that has at least one matching recruiter', async () => {
      mockPrismaService.candidate.findUnique.mockResolvedValue({
        addressState: { code: 'MH' },
      });
      mockPrismaService.systemConfig.findUnique.mockResolvedValue({
        value: { MH: ['ml', 'hi'] },
      });
      mockPrismaService.language.findMany.mockResolvedValue([
        { code: 'ml' },
        { code: 'hi' },
      ]);
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: 'rmi',
          name: 'Malayalam',
          ...recruitersBase,
          candidateRecruiterAssignments: [],
          userLanguages: [
            { languageCode: 'ml', proficiency: LanguageProficiency.PRIMARY },
          ],
        },
        {
          id: 'rhi',
          name: 'Hindi',
          ...recruitersBase,
          candidateRecruiterAssignments: [],
          userLanguages: [
            { languageCode: 'hi', proficiency: LanguageProficiency.PRIMARY },
          ],
        },
      ]);

      const result = await service.getRecruiterWithLanguageAwareRoundRobin(
        'cand-3',
      );

      expect(result.id).toBe('rmi');
    });

    it('falls back to workload when no recruiter matches configured languages', async () => {
      mockPrismaService.user.findMany
        .mockResolvedValueOnce([
          {
            id: 'x1',
            name: 'No Malayalam',
            ...recruitersBase,
            candidateRecruiterAssignments: [],
            userLanguages: [],
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'y1',
            name: 'Least loaded',
            ...recruitersBase,
            candidateRecruiterAssignments: [],
          },
          {
            id: 'y2',
            name: 'More loaded',
            ...recruitersBase,
            candidateRecruiterAssignments: [{}],
          },
        ]);

      const result = await service.getRecruiterWithLanguageAwareRoundRobin(
        'cand-4',
      );

      expect(result.id).toBe('y1');
      expect(mockPrismaService.user.findMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('getRecruiterCandidates', () => {
    const recruiterId = 'rec-1';

    beforeEach(() => {
      mockPrismaService.candidateStatus.findFirst.mockResolvedValue(null);
      mockPrismaService.candidate.count.mockResolvedValue(1);
      mockPrismaService.candidate.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
    });

    it('uses agent channel predicate for source=agent so agentId-linked manual rows match', async () => {
      await service.getRecruiterCandidates(recruiterId, {
        page: 1,
        limit: 10,
        source: 'agent',
      });

      expect(mockPrismaService.candidate.count).toHaveBeenCalled();
      const listWhere =
        mockPrismaService.candidate.count.mock.calls[0][0].where;

      expect(listWhere.recruiterAssignments).toBeDefined();
      expect(listWhere).toMatchObject({
        AND: expect.arrayContaining([
          expect.objectContaining({
            OR: expect.arrayContaining([
              { source: 'agent' },
              { source: 'agents' },
              { agentId: { not: null } },
            ]),
          }),
        ]),
      });
    });

    it('scopes dashboard counts to agent channel when source=agent', async () => {
      await service.getRecruiterCandidates(recruiterId, {
        page: 1,
        limit: 10,
        source: 'agent',
      });

      expect(mockPrismaService.candidate.findMany).toHaveBeenCalled();

      expect(mockPrismaService.candidate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.any(Object),
              expect.objectContaining({
                OR: expect.any(Array),
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe('getRecruiterWithLeastWorkload', () => {
    it('filters recruiters by profession type when provided', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: 'rec-nurse',
          name: 'Nurse Recruiter',
          email: 'nurse@test.com',
          mobileNumber: '1',
          countryCode: '+91',
          candidateRecruiterAssignments: [],
        },
      ]);

      await service.getRecruiterWithLeastWorkload(nurseProfessionTypeId);

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userProfessionScopes: {
              some: { professionTypeId: nurseProfessionTypeId },
            },
          }),
        }),
      );
    });

    it('only queries recruiters with ACTIVE account status', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: 'rec-1',
          name: 'Active Rec',
          email: 'a@test.com',
          mobileNumber: '1',
          countryCode: '+91',
          candidateRecruiterAssignments: [],
        },
      ]);

      await service.getRecruiterWithLeastWorkload();

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountStatus: UserAccountStatus.ACTIVE,
          }),
        }),
      );
    });
  });
});
