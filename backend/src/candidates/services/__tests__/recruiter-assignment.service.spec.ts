import { Test, TestingModule } from '@nestjs/testing';
import { RecruiterAssignmentService } from '../recruiter-assignment.service';
import { PrismaService } from '../../../database/prisma.service';
import { OutboxService } from '../../../notifications/outbox.service';
import { RolesService } from '../../../roles/roles.service';
import { CandidateListFilterService } from '../candidate-list-filter.service';
import { ROLE_NAMES } from '../../../common/constants/role-ids';
import {
  LanguageProficiency,
  RecruiterProfessionScope,
  UserAccountStatus,
} from '@prisma/client';

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
    professionType: {
      findUnique: jest.fn(),
    },
  };

  const mockOutboxService = {
    publishCandidateRecruiterAssigned: jest.fn(),
  };

  const mockRolesService = {
    findIdByName: jest.fn(),
    findRecruiterRoleIds: jest.fn(),
  };

  const mockCandidateListFilterService = {
    applyCrmStatusNameFilter: jest.fn().mockResolvedValue(undefined),
    applySearchFilter: jest.fn(),
    applyCreatedAtFilter: jest.fn(),
    applyAdvancedListFilters: jest.fn(),
    applySourceFilter: jest.fn(
      (
        where: { AND?: unknown },
        query: { source?: string; sources?: string[] },
        agentChannelWhere?: unknown,
      ) => {
        if (
          agentChannelWhere &&
          (query.source === 'agent' ||
            (query.sources?.length === 1 && query.sources[0] === 'agent'))
        ) {
          where.AND = [
            ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
            agentChannelWhere,
          ];
        }
      },
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRolesService.findIdByName.mockImplementation(async (name: string) => {
      if (name === ROLE_NAMES.RECRUITER) return recruiterRoleId;
      return 'other-role';
    });
    mockRolesService.findRecruiterRoleIds.mockResolvedValue([recruiterRoleId]);
    mockPrismaService.professionType.findUnique.mockResolvedValue({
      sector: 'HEALTHCARE',
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
        professionType: { sector: 'HEALTHCARE' },
      });

      const result = await service.getBestRecruiterForAssignment(
        'cand-1',
        'user-rec',
      );

      expect(result.isRoundRobin).toBe(false);
      expect(result.directAssignmentKind).toBe('recruiter');
      expect(result.id).toBe('user-rec');
    });

    it('assigns directly when Recruiter creator has Any healthcare coverage', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...recruiterUser,
        handlesAllProfessions: true,
        recruiterSectorScope: RecruiterProfessionScope.HEALTHCARE,
        userProfessionScopes: [],
      });
      mockPrismaService.candidate.findUnique.mockResolvedValue({
        professionTypeId: nurseProfessionTypeId,
        professionType: { sector: 'HEALTHCARE' },
      });

      const result = await service.getBestRecruiterForAssignment(
        'cand-1',
        'user-rec',
      );

      expect(result.isRoundRobin).toBe(false);
      expect(result.directAssignmentKind).toBe('recruiter');
      expect(result.id).toBe('user-rec');
    });

    it('uses round-robin when Any healthcare Recruiter creates a non-healthcare candidate', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...recruiterUser,
        handlesAllProfessions: true,
        recruiterSectorScope: RecruiterProfessionScope.HEALTHCARE,
        userProfessionScopes: [],
      });
      mockPrismaService.candidate.findUnique
        .mockResolvedValueOnce({
          professionTypeId: 'pt_driver_seed01',
          professionType: { sector: 'NON_HEALTH_CARE' },
        })
        .mockResolvedValueOnce({ source: 'manual' })
        .mockResolvedValue({
          professionTypeId: 'pt_driver_seed01',
          professionType: { sector: 'NON_HEALTH_CARE' },
        });
      mockPrismaService.professionType.findUnique.mockResolvedValue({
        sector: 'NON_HEALTH_CARE',
      });
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: 'user-driver-rec',
          name: 'Driver Recruiter',
          email: 'drv@test.com',
          mobileNumber: '111',
          countryCode: '+1',
          candidateRecruiterAssignments: [],
        },
      ]);

      const result = await service.getBestRecruiterForAssignment(
        'cand-driver',
        'user-rec',
      );

      expect(result.isRoundRobin).toBe(true);
      expect(result.id).toBe('user-driver-rec');
    });

    it('assigns directly when Both + Any Recruiter creates any profession', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...recruiterUser,
        handlesAllProfessions: true,
        recruiterSectorScope: RecruiterProfessionScope.BOTH,
        userProfessionScopes: [],
      });
      mockPrismaService.candidate.findUnique.mockResolvedValue({
        professionTypeId: 'pt_driver_seed01',
        professionType: { sector: 'NON_HEALTH_CARE' },
      });

      const result = await service.getBestRecruiterForAssignment(
        'cand-driver',
        'user-rec',
      );

      expect(result.isRoundRobin).toBe(false);
      expect(result.directAssignmentKind).toBe('recruiter');
    });

    it('assigns directly when Any healthcare Recruiter creates Any-healthcare candidate', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...recruiterUser,
        handlesAllProfessions: true,
        recruiterSectorScope: RecruiterProfessionScope.HEALTHCARE,
        userProfessionScopes: [],
      });
      mockPrismaService.candidate.findUnique.mockResolvedValue({
        professionTypeId: null,
        focusesAllProfessions: true,
        professionSector: 'HEALTHCARE',
        professionType: null,
      });

      const result = await service.getBestRecruiterForAssignment(
        'cand-any-health',
        'user-rec',
      );

      expect(result.isRoundRobin).toBe(false);
      expect(result.directAssignmentKind).toBe('recruiter');
    });

    it('uses round-robin when subset Recruiter creates Any-healthcare candidate', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(recruiterUser);
      mockPrismaService.candidate.findUnique
        .mockResolvedValueOnce({
          professionTypeId: null,
          focusesAllProfessions: true,
          professionSector: 'HEALTHCARE',
          professionType: null,
        })
        .mockResolvedValueOnce({ source: 'manual' })
        .mockResolvedValue({
          professionTypeId: null,
          focusesAllProfessions: true,
          professionSector: 'HEALTHCARE',
          professionType: null,
        });
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: 'user-any-rec',
          name: 'Any Health Recruiter',
          email: 'any@test.com',
          mobileNumber: '111',
          countryCode: '+1',
          candidateRecruiterAssignments: [],
        },
      ]);

      const result = await service.getBestRecruiterForAssignment(
        'cand-any-health',
        'user-rec',
      );

      expect(result.isRoundRobin).toBe(true);
      expect(result.id).toBe('user-any-rec');
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              {
                handlesAllProfessions: true,
                recruiterSectorScope: RecruiterProfessionScope.BOTH,
              },
              {
                handlesAllProfessions: true,
                recruiterSectorScope: RecruiterProfessionScope.HEALTHCARE,
              },
            ],
          }),
        }),
      );
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
            OR: [
              {
                userProfessionScopes: {
                  some: { professionTypeId: nurseProfessionTypeId },
                },
              },
              {
                handlesAllProfessions: true,
                recruiterSectorScope: RecruiterProfessionScope.BOTH,
              },
              {
                handlesAllProfessions: true,
                recruiterSectorScope: RecruiterProfessionScope.HEALTHCARE,
              },
            ],
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

  describe('backfillUnassignedRecruiterAssignments', () => {
    const nonHcProfession = {
      professionTypeId: 'pt_driver',
      focusesAllProfessions: false,
      professionSector: 'NON_HEALTH_CARE',
      professionType: { sector: 'NON_HEALTH_CARE' },
    };
    const hcProfession = {
      professionTypeId: nurseProfessionTypeId,
      focusesAllProfessions: false,
      professionSector: 'HEALTHCARE',
      professionType: { sector: 'HEALTHCARE' },
    };

    const recInfo = (id: string) => ({
      id,
      name: id,
      email: `${id}@test.com`,
      isRoundRobin: true,
    });

    it('assigns unassigned non-healthcare candidates when recruiter covers that sector', async () => {
      mockPrismaService.candidate.findMany.mockResolvedValue([
        { id: 'c-nhc', ...nonHcProfession },
        { id: 'c-hc', ...hcProfession },
      ]);
      mockPrismaService.user.findUnique.mockResolvedValue({
        handlesAllProfessions: true,
        recruiterSectorScope: RecruiterProfessionScope.NON_HEALTH_CARE,
        userProfessionScopes: [],
      });
      mockPrismaService.candidateRecruiterAssignment.findFirst.mockResolvedValue(
        null,
      );
      mockPrismaService.candidateRecruiterAssignment.updateMany.mockResolvedValue(
        { count: 0 },
      );
      mockPrismaService.candidateRecruiterAssignment.create.mockResolvedValue({});
      jest
        .spyOn(service, 'getRecruiterWithLanguageAwareRoundRobin')
        .mockResolvedValue(recInfo('rec-nhc') as never);

      const result = await service.backfillUnassignedRecruiterAssignments({
        recruiterId: 'rec-nhc',
        assignedByUserId: 'admin-1',
      });

      expect(result.assigned).toBe(1);
      expect(result.failed).toBe(0);
      expect(service.getRecruiterWithLanguageAwareRoundRobin).toHaveBeenCalledWith(
        'c-nhc',
      );
      expect(service.getRecruiterWithLanguageAwareRoundRobin).not.toHaveBeenCalledWith(
        'c-hc',
      );
    });

    it('assigns unassigned healthcare candidates when recruiter covers healthcare', async () => {
      mockPrismaService.candidate.findMany.mockResolvedValue([
        { id: 'c-hc', ...hcProfession },
      ]);
      mockPrismaService.user.findUnique.mockResolvedValue({
        handlesAllProfessions: true,
        recruiterSectorScope: RecruiterProfessionScope.HEALTHCARE,
        userProfessionScopes: [],
      });
      mockPrismaService.candidateRecruiterAssignment.findFirst.mockResolvedValue(
        null,
      );
      mockPrismaService.candidateRecruiterAssignment.updateMany.mockResolvedValue(
        { count: 0 },
      );
      mockPrismaService.candidateRecruiterAssignment.create.mockResolvedValue({});
      jest
        .spyOn(service, 'getRecruiterWithLanguageAwareRoundRobin')
        .mockResolvedValue(recInfo('rec-hc') as never);

      const result = await service.backfillUnassignedRecruiterAssignments({
        recruiterId: 'rec-hc',
        assignedByUserId: 'admin-1',
      });

      expect(result.assigned).toBe(1);
      expect(
        mockPrismaService.candidateRecruiterAssignment.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignmentType: 'auto_backfill',
            recruiterId: 'rec-hc',
          }),
        }),
      );
    });

    it('round-robins 4 unassigned candidates across 3 recruiters by least workload', async () => {
      mockPrismaService.candidate.findMany.mockResolvedValue(
        ['c1', 'c2', 'c3', 'c4'].map((id) => ({ id, ...hcProfession })),
      );
      mockPrismaService.candidateRecruiterAssignment.findFirst.mockResolvedValue(
        null,
      );
      mockPrismaService.candidateRecruiterAssignment.updateMany.mockResolvedValue(
        { count: 0 },
      );
      mockPrismaService.candidateRecruiterAssignment.create.mockResolvedValue({});

      const picks = ['r1', 'r2', 'r3', 'r1'];
      const spy = jest
        .spyOn(service, 'getRecruiterWithLanguageAwareRoundRobin')
        .mockImplementation(async () => recInfo(picks.shift() as string) as never);

      const result = await service.backfillUnassignedRecruiterAssignments({
        assignedByUserId: 'admin-1',
      });

      expect(result.assigned).toBe(4);
      const recruiterIds =
        mockPrismaService.candidateRecruiterAssignment.create.mock.calls.map(
          (call: [{ data: { recruiterId: string } }]) => call[0].data.recruiterId,
        );
      expect(recruiterIds.filter((id: string) => id === 'r1')).toHaveLength(2);
      expect(recruiterIds.filter((id: string) => id === 'r2')).toHaveLength(1);
      expect(recruiterIds.filter((id: string) => id === 'r3')).toHaveLength(1);
      spy.mockRestore();
    });

    it('does not consume agent-channel candidates (query excludes them)', async () => {
      mockPrismaService.candidate.findMany.mockResolvedValue([]);

      await service.backfillUnassignedRecruiterAssignments({
        assignedByUserId: 'admin-1',
      });

      expect(mockPrismaService.candidate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recruiterAssignments: { none: { isActive: true } },
            NOT: expect.objectContaining({
              OR: expect.any(Array),
            }),
          }),
        }),
      );
    });

    it('is idempotent when candidates already have an active assignment', async () => {
      mockPrismaService.candidate.findMany.mockResolvedValue([
        { id: 'c-hc', ...hcProfession },
      ]);
      mockPrismaService.candidateRecruiterAssignment.findFirst.mockResolvedValue(
        { recruiterId: 'already' },
      );
      const spy = jest.spyOn(service, 'getRecruiterWithLanguageAwareRoundRobin');

      const result = await service.backfillUnassignedRecruiterAssignments({
        assignedByUserId: 'admin-1',
      });

      expect(result.assigned).toBe(0);
      expect(result.skipped).toBe(1);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('is a no-op on a second run when no unassigned candidates remain', async () => {
      mockPrismaService.candidate.findMany.mockResolvedValue([]);

      const first = await service.backfillUnassignedRecruiterAssignments({
        assignedByUserId: 'admin-1',
      });
      const second = await service.backfillUnassignedRecruiterAssignments({
        assignedByUserId: 'admin-1',
      });

      expect(first).toEqual({ assigned: 0, skipped: 0, failed: 0 });
      expect(second).toEqual({ assigned: 0, skipped: 0, failed: 0 });
    });
  });
});
