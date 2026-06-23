import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { CandidatesService } from '../candidates.service';
import { PrismaService } from '../../database/prisma.service';
import { RoundRobinService } from '../../round-robin/round-robin.service';
import { CreateCandidateDto } from '../dto/create-candidate.dto';
import { UpdateCandidateDto } from '../dto/update-candidate.dto';
import { AssignProjectDto } from '../dto/assign-project.dto';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { OutboxService } from '../../notifications/outbox.service';
import { PipelineService } from '../pipeline.service';
import { UnifiedEligibilityService } from '../../candidate-eligibility/unified-eligibility.service';
import { RecruiterAssignmentService } from '../services/recruiter-assignment.service';
import { RnrRemindersService } from '../../rnr-reminders/rnr-reminders.service';
import { CallbackRemindersService } from '../../callback-reminders/callback-reminders.service';
import { WhatsAppService } from '../../notifications/whatsapp.service';
import { WhatsAppNotificationService } from '../../notifications/whatsapp-notification.service';
import { CandidateCodeService } from '../services/candidate-code.service';
import { CandidateListFilterService } from '../services/candidate-list-filter.service';
import { CandidateCountryRestrictionsService } from '../../candidate-country-restrictions/candidate-country-restrictions.service';

describe('CandidatesService', () => {
  let service: CandidatesService;
  let prismaService: any;

  const mockPrismaService: any = {
    $transaction: jest.fn(),
    candidate: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    document: {
      findFirst: jest.fn(),
      findMany: jest.fn(async () => []),
    },
    candidateStatus: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    candidateStatusHistory: {
      create: jest.fn(),
      count: jest.fn(async () => 0),
    },
    team: {
      findUnique: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
    roleCatalog: {
      findMany: jest.fn(),
    },
    professionType: {
      findFirst: jest.fn(),
    },
    agent: {
      findUnique: jest.fn(),
    },
    candidateProjects: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    candidateRecruiterAssignment: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    country: {
      findUnique: jest.fn(),
    },
    state: {
      findUnique: jest.fn(),
    },
    interviewStatusHistory: {
      findFirst: jest.fn(),
    },
  };

  const mockOutboxService: any = {
    enqueue: jest.fn(),
    publishEvent: jest.fn(async () => undefined),
  };
  const mockPipelineService = {};
  const mockEligibilityService = {};
  const mockRecruiterAssignmentService = {
    assignRecruiterToCandidate: jest.fn(),
  };
  const mockRnrRemindersService = {};
  const mockCallbackRemindersService = {};
  const mockWhatsAppService = {};
  const mockWhatsAppNotificationService = {};
  const mockCandidateCodeService: any = {
    reserveNextCode: jest.fn(),
  };
  const mockCandidateListFilterService: any = {
    applyCreatedAtFilter: jest.fn(),
    applySearchFilter: jest.fn(),
    applyCrmStatusNameFilter: jest.fn(async () => undefined),
    applyAdvancedListFilters: jest.fn((where: any, query: any) => {
      if (query.minAge == null && query.maxAge == null) return;
      const now = new Date();
      where.dateOfBirth = {};
      if (query.maxAge != null) {
        const earliest = new Date(now);
        earliest.setFullYear(now.getFullYear() - query.maxAge);
        earliest.setHours(0, 0, 0, 0);
        where.dateOfBirth.gte = earliest;
      }
      if (query.minAge != null) {
        const latest = new Date(now);
        latest.setFullYear(now.getFullYear() - query.minAge);
        latest.setHours(23, 59, 59, 999);
        where.dateOfBirth.lte = latest;
      }
    }),
  };
  const mockCountryRestrictionsService = {};

  const validProfessionTypeId = 'pt_nurse_seed001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidatesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        { provide: OutboxService, useValue: mockOutboxService },
        { provide: PipelineService, useValue: mockPipelineService },
        {
          provide: UnifiedEligibilityService,
          useValue: mockEligibilityService,
        },
        {
          provide: RecruiterAssignmentService,
          useValue: mockRecruiterAssignmentService,
        },
        { provide: CandidateCodeService, useValue: mockCandidateCodeService },
        {
          provide: CandidateListFilterService,
          useValue: mockCandidateListFilterService,
        },
        { provide: RnrRemindersService, useValue: mockRnrRemindersService },
        {
          provide: CallbackRemindersService,
          useValue: mockCallbackRemindersService,
        },
        { provide: WhatsAppService, useValue: mockWhatsAppService },
        {
          provide: WhatsAppNotificationService,
          useValue: mockWhatsAppNotificationService,
        },
        {
          provide: CandidateCountryRestrictionsService,
          useValue: mockCountryRestrictionsService,
        },
      ],
    }).compile();

    service = module.get<CandidatesService>(CandidatesService);
    prismaService = module.get(PrismaService);
    prismaService.candidateRecruiterAssignment.findFirst.mockResolvedValue(null);
    prismaService.candidateStatus.findMany.mockImplementation(
      async ({ where }: { where?: { OR?: Array<{ statusName?: { equals?: string } }> } }) => {
        const names = (where?.OR ?? []).map((o) => o.statusName?.equals?.toLowerCase());
        const map: Record<string, number> = {
          interested: 2,
          future: 7,
          'on hold': 8,
          'call back': 11,
          qualified: 5,
          'not interested': 3,
          'other enquiry': 9,
          rnr: 6,
          'not eligible': 4,
          deployed: 10,
        };
        return names
          .filter((n): n is string => !!n && n in map)
          .map((n) => ({ id: map[n] }));
      },
    );
    prismaService.professionType.findFirst.mockResolvedValue({
      id: validProfessionTypeId,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Legacy tests: pre firstName/lastName + transaction-based create; refresh when revisiting coverage.
  describe.skip('create', () => {
    const createCandidateDto = {
      name: 'John Doe',
      contact: '+1234567890',
      email: 'john.doe@example.com',
      source: 'manual',
      currentStatus: 'new',
      experience: 5,
      skills: '["Nursing", "Patient Care"]',
      currentEmployer: 'City Hospital',
      expectedMinSalary: 40000,
      expectedMaxSalary: 60000,
      preferredCountries: ['AE', 'KW'],
      facilityPreferences: ['clinic', 'home_care'],
      teamId: 'team123',
    } as unknown as CreateCandidateDto;

    const mockCandidate = {
      id: 'candidate123',
      name: 'John Doe',
      contact: '+1234567890',
      email: 'john.doe@example.com',
      recruiter: { id: 'user123', name: 'Test User' },
      team: { id: 'team123', name: 'Test Team' },
    };

    it('should create a candidate successfully', async () => {
      prismaService.candidate.findUnique.mockResolvedValue(null);
      prismaService.team.findUnique.mockResolvedValue({
        id: 'team123',
        name: 'Test Team',
      } as any);
      prismaService.candidate.create.mockResolvedValue(mockCandidate as any);

      const result = await service.create(createCandidateDto, 'user123');

      expect(result).toEqual(mockCandidate);
      expect(prismaService.candidate.create).toHaveBeenCalledWith({
        data: {
          name: 'John Doe',
          contact: '+1234567890',
          email: 'john.doe@example.com',
          source: 'manual',
          dateOfBirth: null,
          currentStatus: 'new',
          experience: 5,
          skills: ['Nursing', 'Patient Care'],
          currentEmployer: 'City Hospital',
          expectedMinSalary: 40000,
          expectedMaxSalary: 60000,
          assignedTo: 'user123',
          teamId: 'team123',
        },
        include: expect.any(Object),
      });
    });

    it('should throw ConflictException when contact already exists', async () => {
      prismaService.candidate.findUnique.mockResolvedValue({
        id: 'existing123',
      } as any);

      await expect(
        service.create(createCandidateDto, 'user123'),
      ).rejects.toThrow(
        new ConflictException(
          'Candidate with contact +1234567890 already exists',
        ),
      );
    });

    it('should throw NotFoundException when team does not exist', async () => {
      prismaService.candidate.findUnique.mockResolvedValue(null);
      prismaService.team.findUnique.mockResolvedValue(null);

      await expect(
        service.create(createCandidateDto, 'user123'),
      ).rejects.toThrow(
        new NotFoundException('Team with ID team123 not found'),
      );
    });

    it('should throw BadRequestException when date of birth is in the future', async () => {
      const futureDateDto = {
        ...createCandidateDto,
        dateOfBirth: '2030-01-01T00:00:00.000Z',
      };

      prismaService.candidate.findUnique.mockResolvedValue(null);
      prismaService.team.findUnique.mockResolvedValue({
        id: 'team123',
        name: 'Test Team',
      } as any);

      await expect(service.create(futureDateDto, 'user123')).rejects.toThrow(
        new BadRequestException('Date of birth must be in the past'),
      );
    });
  });

  describe('lookupByPassport', () => {
    it('returns found when candidate has passportNumber', async () => {
      prismaService.candidate.findFirst.mockResolvedValue({
        id: 'c-1',
        candidateCode: 'AFF001',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'j@test.com',
        countryCode: '+91',
        mobileNumber: '9999999999',
      });

      const result = await service.lookupByPassport('AB123');

      expect(result.found).toBe(true);
      expect(result.candidate?.firstName).toBe('Jane');
      expect(prismaService.document.findFirst).not.toHaveBeenCalled();
    });

    it('returns found from passport document when candidate field empty', async () => {
      prismaService.candidate.findFirst.mockResolvedValue(null);
      prismaService.document.findFirst.mockResolvedValue({
        candidate: {
          id: 'c-2',
          candidateCode: null,
          firstName: 'Doc',
          lastName: 'Only',
          email: null,
          countryCode: null,
          mobileNumber: null,
        },
      });

      const result = await service.lookupByPassport('XY999');

      expect(result.found).toBe(true);
      expect(result.candidate?.lastName).toBe('Only');
    });

    it('returns not found for short passport input', async () => {
      const result = await service.lookupByPassport('AB');
      expect(result.found).toBe(false);
    });
  });

  describe('create (agent coordinator passport)', () => {
    const acUser = {
      name: 'AC User',
      email: 'ac@test.com',
      userRoles: [{ role: { name: 'Agent Coordinator' } }],
    };

    const baseAcDto = {
      firstName: 'Agent',
      lastName: 'Candidate',
      passportNumber: 'P1234567',
      source: 'agent',
      agentId: 'agent-1',
      gender: 'MALE',
      professionTypeId: validProfessionTypeId,
    } as unknown as CreateCandidateDto;

    let txCandidateCreate: ReturnType<typeof jest.fn>;

    beforeEach(() => {
      txCandidateCreate = jest.fn(async () => ({ id: 'cand-ac' }));
      prismaService.user.findUnique.mockResolvedValue(acUser);
      prismaService.candidate.findFirst.mockResolvedValue(null);
      prismaService.document.findFirst.mockResolvedValue(null);
      prismaService.candidate.findUnique.mockResolvedValue(null);
      prismaService.agent.findUnique.mockResolvedValue({ id: 'agent-1' });
      prismaService.candidateStatus.findFirst.mockResolvedValue({
        id: 2,
        statusName: 'Interested',
      });
      prismaService.candidateStatus.findUnique.mockResolvedValue({
        statusName: 'Interested',
      });
      prismaService.candidateStatusHistory.create.mockResolvedValue({} as any);
      (mockRecruiterAssignmentService.assignRecruiterToCandidate as any).mockResolvedValue(
        null,
      );
      mockCandidateCodeService.reserveNextCode.mockResolvedValue('AFFCD012026');
      prismaService.$transaction.mockImplementation(async (fn: any) =>
        fn({
          candidate: {
            create: txCandidateCreate,
            findUniqueOrThrow: jest.fn(async () => ({
              id: 'cand-ac',
              candidateCode: 'AFFCD012026',
            })),
          },
          agentCandidateDeclaredProject: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
          },
        }),
      );
    });

    it('creates without phone and stores passportNumber', async () => {
      await service.create(baseAcDto, 'ac-user');

      expect(txCandidateCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            countryCode: null,
            mobileNumber: null,
            passportNumber: 'P1234567',
            currentStatusId: 2,
          }),
        }),
      );
    });

    it('defaults status to Interested when created by agent coordinator', async () => {
      await service.create(baseAcDto, 'ac-user');

      expect(prismaService.candidateStatus.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            statusName: {
              equals: 'interested',
              mode: 'insensitive',
            },
          },
        }),
      );
      expect(prismaService.candidateStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            statusId: 2,
            statusNameSnapshot: 'Interested',
          }),
        }),
      );
    });

    it('throws ConflictException when passport already exists', async () => {
      prismaService.candidate.findFirst.mockResolvedValue({
        id: 'existing',
        candidateCode: 'AFFOLD',
        firstName: 'Old',
        lastName: 'Record',
        email: null,
        countryCode: null,
        mobileNumber: null,
      });

      await expect(service.create(baseAcDto, 'ac-user')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws BadRequestException when passport missing', async () => {
      await expect(
        service.create(
          { ...baseAcDto, passportNumber: '' } as CreateCandidateDto,
          'ac-user',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('create (phone required for non-AC)', () => {
    it('throws BadRequestException when phone omitted', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        name: 'Recruiter',
        email: 'r@test.com',
        userRoles: [{ role: { name: 'Recruiter' } }],
      });

      await expect(
        service.create(
          {
            firstName: 'John',
            lastName: 'Doe',
            source: 'manual',
            professionTypeId: validProfessionTypeId,
          } as CreateCandidateDto,
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('create (candidateCode)', () => {
    it('generates candidateCode and passes it to candidate.create', async () => {
      const createCandidateDto = {
        firstName: 'John',
        lastName: 'Doe',
        countryCode: '+91',
        mobileNumber: '9999999999',
        source: 'manual',
        currentStatusId: 1,
        dateOfBirth: '1990-01-01T00:00:00.000Z',
        professionTypeId: validProfessionTypeId,
      } as unknown as CreateCandidateDto;

      prismaService.candidate.findUnique.mockResolvedValue(null);
      prismaService.user.findUnique.mockResolvedValue({
        name: 'Creator',
        email: 'creator@test.com',
        userRoles: [],
      });
      prismaService.candidateStatus.findUnique.mockResolvedValue({
        statusName: 'Untouched',
      });
      prismaService.candidateStatusHistory.create.mockResolvedValue({} as any);
      (mockRecruiterAssignmentService.assignRecruiterToCandidate as any).mockResolvedValue({
        id: 'rec-1',
        name: 'Recruiter',
        email: 'rec@test.com',
      });

      mockCandidateCodeService.reserveNextCode.mockResolvedValue('AFFCD012026');

      const tx: any = {
        candidate: {
          create: jest.fn(async () => ({ id: 'cand-1' })),
          findUniqueOrThrow: jest.fn(async () => ({
            id: 'cand-1',
            candidateCode: 'AFFCD012026',
          })),
        },
      };

      prismaService.$transaction.mockImplementation(async (fn: any) => fn(tx));

      await service.create(createCandidateDto, 'user-1');

      expect(mockCandidateCodeService.reserveNextCode).toHaveBeenCalledWith(tx);
      expect(tx.candidate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            candidateCode: 'AFFCD012026',
          }),
        }),
      );
    });

    it('persists optional addressPincode and alternatePhone on create', async () => {
      const createCandidateDto = {
        firstName: 'John',
        lastName: 'Doe',
        countryCode: '+91',
        mobileNumber: '9999999999',
        source: 'manual',
        currentStatusId: 1,
        dateOfBirth: '1990-01-01T00:00:00.000Z',
        professionTypeId: validProfessionTypeId,
        address: '12 MG Road',
        addressPincode: '682016',
        alternatePhone: '9876543211',
      } as unknown as CreateCandidateDto;

      prismaService.candidate.findUnique.mockResolvedValue(null);
      prismaService.user.findUnique.mockResolvedValue({
        name: 'Creator',
        email: 'creator@test.com',
        userRoles: [],
      });
      prismaService.candidateStatus.findUnique.mockResolvedValue({
        statusName: 'Untouched',
      });
      prismaService.candidateStatusHistory.create.mockResolvedValue({} as any);
      (mockRecruiterAssignmentService.assignRecruiterToCandidate as any).mockResolvedValue({
        id: 'rec-1',
        name: 'Recruiter',
        email: 'rec@test.com',
      });

      mockCandidateCodeService.reserveNextCode.mockResolvedValue('AFFCD012026');

      const tx: any = {
        candidate: {
          create: jest.fn(async () => ({ id: 'cand-1' })),
          findUniqueOrThrow: jest.fn(async () => ({
            id: 'cand-1',
            candidateCode: 'AFFCD012026',
          })),
        },
      };

      prismaService.$transaction.mockImplementation(async (fn: any) => fn(tx));

      await service.create(createCandidateDto, 'user-1');

      expect(tx.candidate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            address: '12 MG Road',
            addressPincode: '682016',
            alternatePhone: '9876543211',
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    const mockCandidates = [
      {
        id: 'candidate123',
        name: 'John Doe',
        contact: '+1234567890',
        email: 'john.doe@example.com',
        recruiter: { id: 'user123', name: 'Test User' },
        team: { id: 'team123', name: 'Test Team' },
      },
    ];

    it.skip('should return paginated candidates', async () => {
      prismaService.candidate.count.mockResolvedValue(1);
      prismaService.candidate.findMany.mockResolvedValue(mockCandidates as any);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        candidates: mockCandidates,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });
    });

    it.skip('should apply search filter (includes qualifications)', async () => {
      prismaService.candidate.count.mockResolvedValue(1);
      prismaService.candidate.findMany.mockResolvedValue(mockCandidates as any);

      await service.findAll({ search: 'john' });

      expect(prismaService.candidate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ firstName: { contains: 'john', mode: 'insensitive' } }),
              expect.objectContaining({ lastName: { contains: 'john', mode: 'insensitive' } }),
              expect.objectContaining({ mobileNumber: { contains: 'john', mode: 'insensitive' } }),
              expect.objectContaining({ email: { contains: 'john', mode: 'insensitive' } }),
              // qualifications.some -> qualification.name/field and candidateQualification.university should be included
              expect.objectContaining({
                qualifications: expect.objectContaining({
                  some: expect.objectContaining({
                    OR: expect.arrayContaining([
                      expect.objectContaining({ qualification: expect.objectContaining({ name: { contains: 'john', mode: 'insensitive' } }) }),
                      expect.objectContaining({ qualification: expect.objectContaining({ field: { contains: 'john', mode: 'insensitive' } }) }),
                      expect.objectContaining({ university: { contains: 'john', mode: 'insensitive' } }),
                    ]),
                  }),
                }),
              }),
            ]),
          }),
        }),
      );
    });

    it('should not include projects in findAll list query', async () => {
      prismaService.candidate.count.mockResolvedValue(0);
      prismaService.candidate.groupBy.mockResolvedValue([]);
      prismaService.candidateStatus.findMany.mockResolvedValue([
        { id: 1, statusName: 'Untouched' },
        { id: 2, statusName: 'Interested' },
      ]);
      prismaService.candidate.findMany.mockResolvedValue([
        {
          id: 'candidate123',
          recruiterAssignments: [],
          statusHistories: [],
          documents: [],
          workExperiences: [],
        },
      ] as any);

      await service.findAll({ page: 1, limit: 10, roles: ['Manager'] });

      const findManyCall = prismaService.candidate.findMany.mock.calls[0][0];
      expect(findManyCall.include).toBeDefined();
      expect(findManyCall.include.projects).toBeUndefined();
    });

    it.skip('should apply createdAt date range filter and expand same-day ranges', async () => {
      prismaService.candidate.count.mockResolvedValue(1);
      prismaService.candidate.findMany.mockResolvedValue(mockCandidates as any);

      const dateFrom = '2026-02-17T00:00:00.000Z';
      const dateToSame = '2026-02-17T00:00:00.000Z'; // same timestamp -> should be expanded

      await service.findAll({ page: 1, limit: 10, dateFrom, dateTo: dateToSame } as any);

      expect(prismaService.candidate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );

      const callArg = prismaService.candidate.findMany.mock.calls[0][0];
      expect(callArg.where.createdAt.gte.toISOString()).toBe(new Date(dateFrom).toISOString());

      // expanded lte should be dateFrom + 24h - 1ms
      const expectedLte = new Date(new Date(dateFrom).getTime() + 24 * 60 * 60 * 1000 - 1);
      expect(callArg.where.createdAt.lte.toISOString()).toBe(expectedLte.toISOString());
    });

    describe('getCandidateOverview', () => {
      it('should convert minAge/maxAge to dateOfBirth filter', async () => {
        prismaService.candidate.count.mockResolvedValue(0);
        prismaService.candidate.findMany
          .mockResolvedValueOnce([]) // allCandidates
          .mockResolvedValueOnce([]); // candidates

        await service.getCandidateOverview(
          {
            recruiterId: 'all',
            dateFilter: 'all',
            minAge: 25,
            maxAge: 35,
          } as any,
          'user1',
          ['Manager'],
        );

        expect(prismaService.candidate.findMany).toHaveBeenCalled();

        const firstFindCall = prismaService.candidate.findMany.mock.calls[0][0];
        expect(firstFindCall.where.dateOfBirth).toBeDefined();
        expect(firstFindCall.where.dateOfBirth.gte).toBeInstanceOf(Date);
        expect(firstFindCall.where.dateOfBirth.lte).toBeInstanceOf(Date);

        const now = new Date();
        const expectedFrom = new Date(now);
        expectedFrom.setFullYear(now.getFullYear() - 35);
        expectedFrom.setHours(0, 0, 0, 0);

        const expectedTo = new Date(now);
        expectedTo.setFullYear(now.getFullYear() - 25);
        expectedTo.setHours(23, 59, 59, 999);

        expect(firstFindCall.where.dateOfBirth.gte.getTime()).toBe(expectedFrom.getTime());
        expect(firstFindCall.where.dateOfBirth.lte.getTime()).toBe(expectedTo.getTime());
      });

      it('should filter positive by CRM status including nominated candidates', async () => {
        prismaService.candidate.count.mockResolvedValue(0);
        prismaService.candidate.findMany.mockResolvedValue([]);

        await service.getCandidateOverview(
          {
            recruiterId: 'all',
            status: 'positive',
          } as any,
          'user1',
          ['Manager'],
        );

        expect(prismaService.candidateStatus.findMany).toHaveBeenCalled();

        const listWhere = prismaService.candidate.findMany.mock.calls[0][0].where;
        const positiveTileFilter = listWhere.AND.find(
          (clause: any) => clause?.OR?.[0]?.currentStatusId?.in,
        );
        expect(positiveTileFilter.OR[0].currentStatusId.in).toEqual(
          expect.arrayContaining([2, 5, 7, 8, 11]),
        );
        expect(listWhere.projects).toBeUndefined();

        await service.getCandidateOverviewStats(
          { recruiterId: 'all' } as any,
          'user1',
          ['Manager'],
        );

        const countWheres = prismaService.candidate.count.mock.calls.map(
          (call: any) => call[0].where,
        );
        const positiveCountWhere = countWheres.find((w: any) =>
          w?.AND?.some(
            (clause: any) =>
              clause?.OR?.[0]?.currentStatusId?.in?.includes(2) &&
              clause?.OR?.[0]?.currentStatusId?.in?.includes(5),
          ),
        );
        expect(positiveCountWhere).toBeDefined();
      });

      it('should scope overview to recruiter assignment or project recruiterId', async () => {
        prismaService.candidate.count.mockResolvedValue(0);
        prismaService.candidate.findMany.mockResolvedValue([]);

        await service.getCandidateOverview(
          {
            recruiterId: 'recruiter-abc',
            status: 'positive',
          } as any,
          'user1',
          ['Manager'],
        );

        const listWhere = prismaService.candidate.findMany.mock.calls[0][0].where;
        const recruiterScope = listWhere.AND.find(
          (clause: any) => clause?.OR?.[0]?.recruiterAssignments,
        );
        expect(recruiterScope.OR[0].recruiterAssignments.some.recruiterId).toBe(
          'recruiter-abc',
        );
        expect(recruiterScope.OR[1].projects.some.recruiterId).toBe(
          'recruiter-abc',
        );
      });

      it('should filter negative by CRM status without requiring no project', async () => {
        prismaService.candidate.count.mockResolvedValue(0);
        prismaService.candidate.findMany.mockResolvedValue([]);

        await service.getCandidateOverview(
          {
            recruiterId: 'all',
            status: 'negative',
          } as any,
          'user1',
          ['Manager'],
        );

        const listWhere = prismaService.candidate.findMany.mock.calls[0][0].where;
        const negativeTileFilter = listWhere.AND.find(
          (clause: any) => clause?.currentStatusId?.in,
        );
        expect(negativeTileFilter.currentStatusId.in).toEqual(
          expect.arrayContaining([3, 4, 6, 9]),
        );
        expect(listWhere.projects).toBeUndefined();
      });

      it('should keep tile counts stable when a dashboard tile filter is active', async () => {
        prismaService.candidate.count.mockImplementation(async ({ where }: any) => {
          const hasPositiveInAnd = where?.AND?.some(
            (clause: any) => clause?.OR?.[0]?.currentStatusId?.in,
          );
          const hasUntouched =
            where?.currentStatus?.statusName === 'Untouched' ||
            where?.AND?.some(
              (clause: any) => clause?.currentStatus?.statusName === 'Untouched',
            );
          if (hasPositiveInAnd && hasUntouched) {
            return 0;
          }
          if (hasPositiveInAnd) {
            return 3;
          }
          if (hasUntouched) {
            return 1;
          }
          return 0;
        });
        prismaService.candidate.findMany.mockResolvedValue([]);

        const stats = await service.getCandidateOverviewStats(
          {
            recruiterId: 'recruiter-abc',
          } as any,
          'user1',
          ['Manager'],
        );

        expect(stats.positive).toBe(3);
        expect(stats.untouched).toBe(1);
      });

      it('should ignore status=all so dashboard tiles are not filtered to zero', async () => {
        prismaService.candidate.count.mockResolvedValue(1);
        prismaService.candidate.findMany.mockResolvedValue([]);

        await service.getCandidateOverview(
          {
            recruiterId: 'all',
            status: 'all',
          } as any,
          'user1',
          ['Manager'],
        );

        const listWhere = prismaService.candidate.findMany.mock.calls[0][0].where;
        expect(listWhere.currentStatus).toBeUndefined();
      });

      it('should filter profile shortlisting by nominated main status', async () => {
        prismaService.candidate.count.mockResolvedValue(0);
        prismaService.candidate.findMany.mockResolvedValue([]);

        await service.getCandidateOverview(
          {
            recruiterId: 'all',
            status: 'profile_shortlisting',
          } as any,
          'user1',
          ['Manager'],
        );

        const listWhere = prismaService.candidate.findMany.mock.calls[0][0].where;
        expect(listWhere.projects.some.mainStatus.name).toBe('nominated');

        prismaService.candidate.count.mockClear();
        await service.getCandidateOverviewStats(
          { recruiterId: 'all' } as any,
          'user1',
          ['Manager'],
        );

        const countWheres = prismaService.candidate.count.mock.calls.map(
          (call: any) => call[0].where,
        );
        expect(
          countWheres.some(
            (w: any) => w?.projects?.some?.mainStatus?.name === 'nominated',
          ),
        ).toBe(true);
      });

      it('should filter registered by documents sub-statuses after send for verification', async () => {
        prismaService.candidate.count.mockResolvedValue(0);
        prismaService.candidate.findMany.mockResolvedValue([]);

        await service.getCandidateOverview(
          {
            recruiterId: 'all',
            status: 'registered',
          } as any,
          'user1',
          ['Manager'],
        );

        const listWhere = prismaService.candidate.findMany.mock.calls[0][0].where;
        expect(listWhere.projects.some.mainStatus.name).toBe('documents');
        expect(listWhere.projects.some.subStatus.name.in).toEqual(
          expect.arrayContaining(['verification_in_progress_document']),
        );

        prismaService.candidate.count.mockClear();
        await service.getCandidateOverviewStats(
          { recruiterId: 'all' } as any,
          'user1',
          ['Manager'],
        );

        const countWheres = prismaService.candidate.count.mock.calls.map(
          (call: any) => call[0].where,
        );
        expect(
          countWheres.some(
            (w: any) =>
              w?.projects?.some?.mainStatus?.name === 'documents' &&
              w?.projects?.some?.subStatus?.name?.in?.includes(
                'verification_in_progress_document',
              ),
          ),
        ).toBe(true);
      });
    });

    describe('workflow sub-status history list filter', () => {
      const projectsClauseFromWhere = (where: any) => {
        if (where?.projects) {
          return where.projects;
        }
        const andClauses = Array.isArray(where?.AND)
          ? where.AND
          : where?.AND
            ? [where.AND]
            : [];
        return andClauses.find((clause: any) => clause?.projects)?.projects;
      };

      beforeEach(() => {
        prismaService.candidate.count.mockResolvedValue(0);
        prismaService.candidate.findMany.mockResolvedValue([]);
      });

      it('should filter registered list by project status history when subStatus is set', async () => {
        await service.getCandidateOverview(
          {
            recruiterId: 'all',
            status: 'registered',
            subStatus: 'documents_verified',
          } as any,
          'user1',
          ['Manager'],
        );

        const projects = projectsClauseFromWhere(
          prismaService.candidate.findMany.mock.calls[0][0].where,
        );
        expect(projects.some.mainStatus.name).toBe('documents');
        expect(
          projects.some.projectStatusHistory.some.subStatus.name,
        ).toBe('documents_verified');
        expect(projects.some.subStatus).toBeUndefined();
      });

      it('should filter interview list by project status history when subStatus is set', async () => {
        await service.getCandidateOverview(
          {
            recruiterId: 'all',
            status: 'interview',
            subStatus: 'interview_passed',
          } as any,
          'user1',
          ['Manager'],
        );

        const projects = projectsClauseFromWhere(
          prismaService.candidate.findMany.mock.calls[0][0].where,
        );
        expect(projects.some.mainStatus.name).toBe('interview');
        expect(
          projects.some.projectStatusHistory.some.subStatus.name,
        ).toBe('interview_passed');
      });

      it('should filter processing list by project status history when subStatus is set', async () => {
        await service.getCandidateOverview(
          {
            recruiterId: 'all',
            status: 'processing',
            subStatus: 'processing_cancelled',
          } as any,
          'user1',
          ['Manager'],
        );

        const projects = projectsClauseFromWhere(
          prismaService.candidate.findMany.mock.calls[0][0].where,
        );
        expect(projects.some.mainStatus.name).toBe('processing');
        expect(
          projects.some.projectStatusHistory.some.subStatus.name,
        ).toBe('processing_cancelled');
      });

      it('should scope workflow history list filter by recruiterId on projects', async () => {
        await service.getCandidateOverview(
          {
            recruiterId: 'recruiter-abc',
            status: 'registered',
            subStatus: 'documents_verified',
          } as any,
          'user1',
          ['Manager'],
        );

        const projects = projectsClauseFromWhere(
          prismaService.candidate.findMany.mock.calls[0][0].where,
        );
        expect(projects.some.recruiterId).toBe('recruiter-abc');
        expect(
          projects.some.projectStatusHistory.some.subStatus.name,
        ).toBe('documents_verified');
      });
    });

    describe('getCandidateOverviewStats registeredSubStatus', () => {
      const projectsClauseFromWhere = (where: any) => {
        if (where?.projects) {
          return where.projects;
        }
        const andClauses = Array.isArray(where?.AND)
          ? where.AND
          : where?.AND
            ? [where.AND]
            : [];
        return andClauses.find((clause: any) => clause?.projects)?.projects;
      };

      it('should include registered sub-status tiles via project status history', async () => {
        let callIndex = 0;
        const countSequence = [
          ...Array(15).fill(0),
          2,
          5,
          1,
          3,
          ...Array(20).fill(0),
        ];
        prismaService.candidate.count.mockImplementation(() =>
          Promise.resolve(countSequence[callIndex++] ?? 0),
        );

        const result = await service.getCandidateOverviewStats(
          { recruiterId: 'all', dateFilter: 'all' } as any,
          'user1',
          ['Manager'],
        );

        expect(result.registeredSubStatus.tiles).toHaveLength(4);
        expect(result.registeredSubStatus.tiles[0]).toMatchObject({
          key: 'send_for_verification',
          subStatusName: 'verification_in_progress_document',
          count: 2,
        });
        expect(result.registeredSubStatus.tiles[1]).toMatchObject({
          subStatusName: 'documents_verified',
          count: 5,
        });
        expect(result.registeredSubStatus.tiles[2]).toMatchObject({
          subStatusName: 'rejected_documents',
          count: 1,
        });
        expect(result.registeredSubStatus.tiles[3]).toMatchObject({
          subStatusName: 'submitted_to_client',
          count: 3,
        });
        expect(prismaService.candidate.count).toHaveBeenCalledTimes(38);

        const countWheres = prismaService.candidate.count.mock.calls.map(
          (call: any) => call[0].where,
        );
        const registeredHistoryNames = [
          'verification_in_progress_document',
          'documents_verified',
          'rejected_documents',
          'submitted_to_client',
        ];
        const historyFilters = countWheres
          .map(
            (w: any) =>
              projectsClauseFromWhere(w)?.some?.projectStatusHistory?.some
                ?.subStatus?.name,
          )
          .filter((name: string) => registeredHistoryNames.includes(name));
        expect(historyFilters).toEqual(registeredHistoryNames);
      });

      it('should include interview sub-status tiles via project status history', async () => {
        let callIndex = 0;
        const countSequence = [...Array(38).fill(0)];
        countSequence[27] = 4;
        countSequence[28] = 2;
        countSequence[29] = 6;
        countSequence[30] = 3;
        countSequence[31] = 5;
        countSequence[32] = 1;
        prismaService.candidate.count.mockImplementation(() =>
          Promise.resolve(countSequence[callIndex++] ?? 0),
        );

        const result = await service.getCandidateOverviewStats(
          { recruiterId: 'all', dateFilter: 'all' } as any,
          'user1',
          ['Manager'],
        );

        expect(result.interviewSubStatus.tiles).toHaveLength(6);
        expect(result.interviewSubStatus.tiles[0]).toMatchObject({
          key: 'shortlisted',
          subStatusName: 'shortlisted',
          count: 4,
        });
        expect(result.interviewSubStatus.tiles[2]).toMatchObject({
          key: 'scheduled',
          subStatusName: 'interview_scheduled',
          label: 'Scheduled',
          count: 6,
        });
        expect(result.interviewSubStatus.tiles[3]).toMatchObject({
          key: 'completed',
          subStatusName: 'interview_completed',
          label: 'Completed',
        });
        expect(result.interviewSubStatus.tiles[4]).toMatchObject({
          key: 'passed',
          subStatusName: 'interview_passed',
          label: 'Passed',
        });
        expect(result.interviewSubStatus.tiles[5]).toMatchObject({
          key: 'failed',
          subStatusName: 'interview_failed',
          label: 'Failed',
          count: 1,
        });

        const interviewHistoryNames = [
          'shortlisted',
          'not_shortlisted',
          'interview_scheduled',
          'interview_completed',
          'interview_passed',
          'interview_failed',
        ];
        const countWheres = prismaService.candidate.count.mock.calls.map(
          (call: any) => call[0].where,
        );
        const historyFilters = countWheres
          .map(
            (w: any) =>
              projectsClauseFromWhere(w)?.some?.projectStatusHistory?.some
                ?.subStatus?.name,
          )
          .filter((name: string) => interviewHistoryNames.includes(name));
        expect(historyFilters).toEqual(interviewHistoryNames);
      });

      it('should include processing sub-status tiles via project status history', async () => {
        let callIndex = 0;
        const countSequence = [
          ...Array(15).fill(0),
          ...Array(18).fill(0),
          3,
          7,
          2,
          4,
          1,
        ];
        prismaService.candidate.count.mockImplementation(() =>
          Promise.resolve(countSequence[callIndex++] ?? 0),
        );

        const result = await service.getCandidateOverviewStats(
          { recruiterId: 'all', dateFilter: 'all' } as any,
          'user1',
          ['Manager'],
        );

        expect(result.processingSubStatus.tiles).toHaveLength(5);
        expect(result.processingSubStatus.tiles[0]).toMatchObject({
          key: 'transferred',
          subStatusName: 'transfered_to_processing',
          label: 'Transferred',
          count: 3,
        });
        expect(result.processingSubStatus.tiles[1]).toMatchObject({
          label: 'In Progress',
          subStatusName: 'processing_in_progress',
          count: 7,
        });
        expect(result.processingSubStatus.tiles[2]).toMatchObject({
          label: 'Completed',
          count: 2,
        });
        expect(result.processingSubStatus.tiles[3]).toMatchObject({
          key: 'hold',
          subStatusName: 'processing_hold',
          label: 'Hold',
          count: 4,
        });
        expect(result.processingSubStatus.tiles[4]).toMatchObject({
          key: 'cancelled',
          subStatusName: 'processing_cancelled',
          label: 'Cancelled',
          count: 1,
        });

        const processingHistoryNames = [
          'transfered_to_processing',
          'processing_in_progress',
          'processing_completed',
          'processing_hold',
          'processing_cancelled',
        ];
        const countWheres = prismaService.candidate.count.mock.calls.map(
          (call: any) => call[0].where,
        );
        const historyFilters = countWheres
          .map(
            (w: any) =>
              projectsClauseFromWhere(w)?.some?.projectStatusHistory?.some
                ?.subStatus?.name,
          )
          .filter((name: string) => processingHistoryNames.includes(name));
        expect(historyFilters).toEqual(processingHistoryNames);
      });

      it('should scope registered sub-status project history by recruiterId', async () => {
        prismaService.candidate.count.mockResolvedValue(0);

        await service.getCandidateOverviewStats(
          { recruiterId: 'recruiter-abc' } as any,
          'user1',
          ['Manager'],
        );

        const historyWheres = prismaService.candidate.count.mock.calls
          .map((call: any) => call[0].where)
          .filter(
            (w: any) =>
              projectsClauseFromWhere(w)?.some?.projectStatusHistory,
          );
        expect(historyWheres.length).toBeGreaterThanOrEqual(22);
        const projects = projectsClauseFromWhere(historyWheres[0]);
        expect(projects.some.recruiterId).toBe('recruiter-abc');
      });

      it('should include screening sub-status tiles via project status history', async () => {
        let callIndex = 0;
        const countSequence = [...Array(38).fill(0)];
        countSequence[19] = 3;
        countSequence[20] = 2;
        countSequence[21] = 4;
        countSequence[22] = 1;
        countSequence[23] = 2;
        countSequence[24] = 1;
        countSequence[25] = 0;
        countSequence[26] = 5;
        prismaService.candidate.count.mockImplementation(() =>
          Promise.resolve(countSequence[callIndex++] ?? 0),
        );

        const result = await service.getCandidateOverviewStats(
          { recruiterId: 'all', dateFilter: 'all' } as any,
          'user1',
          ['Manager'],
        );

        expect(result.screening).toBeDefined();
        expect(result.screeningSubStatus.tiles).toHaveLength(8);
        expect(result.screeningSubStatus.tiles[0]).toMatchObject({
          key: 'assigned',
          subStatusName: 'screening_assigned',
          count: 3,
        });
        expect(result.screeningSubStatus.tiles[7]).toMatchObject({
          key: 'training',
          subStatusName: 'training_assigned',
          label: 'Training',
          count: 5,
        });
      });
    });

    describe('getCandidateOverview screening filter', () => {
      it('should filter screening candidates by screening/training sub-status history', async () => {
        prismaService.candidate.count.mockResolvedValue(0);
        prismaService.candidate.findMany.mockResolvedValue([]);

        await service.getCandidateOverview(
          {
            recruiterId: 'all',
            status: 'screening',
          } as any,
          'user1',
          ['Manager'],
        );

        const listWhere = prismaService.candidate.findMany.mock.calls[0][0].where;
        const historyFilter =
          listWhere.projects?.some?.projectStatusHistory?.some?.subStatus?.name;
        expect(historyFilter?.in).toEqual(
          expect.arrayContaining(['screening_assigned', 'training_completed']),
        );
      });

      it('should filter interview candidates by client interview sub-status history by default', async () => {
        prismaService.candidate.count.mockResolvedValue(0);
        prismaService.candidate.findMany.mockResolvedValue([]);

        await service.getCandidateOverview(
          {
            recruiterId: 'all',
            status: 'interview',
          } as any,
          'user1',
          ['Manager'],
        );

        const listWhere = prismaService.candidate.findMany.mock.calls[0][0].where;
        const historyFilter =
          listWhere.projects?.some?.projectStatusHistory?.some?.subStatus?.name;
        expect(historyFilter?.in).toEqual(
          expect.arrayContaining(['shortlisted', 'interview_scheduled']),
        );
        expect(historyFilter?.in).not.toContain('screening_assigned');
      });
    });

    describe('getCandidateScreeningWorkflow', () => {
      it('should return screening projects with trainings and sub-status counts', async () => {
        const candidateId = 'candidate-screening-1';
        prismaService.candidate.findUnique.mockResolvedValue({
          id: candidateId,
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          profileImage: null,
        });
        prismaService.candidateProjects.groupBy.mockResolvedValue([
          { subStatusId: 'sub-1', _count: { _all: 1 } },
        ]);
        prismaService.candidateProjects.count.mockResolvedValue(1);
        prismaService.candidateProjects.findMany.mockResolvedValue([
          {
            id: 'cp-1',
            projectId: 'proj-1',
            screenings: [],
            trainingAssignments: [
              { id: 'tr-1', trainerId: 'trainer-1', status: 'assigned' },
            ],
          },
        ]);
        prismaService.user.findMany.mockResolvedValue([
          { id: 'trainer-1', name: 'Trainer One', email: 't@example.com', profileImage: null },
        ]);
        prismaService.interviewStatusHistory.findFirst.mockResolvedValue(null);

        const result = await service.getCandidateScreeningWorkflow(candidateId);

        expect(result).not.toBeNull();
        expect(result?.candidate.id).toBe(candidateId);
        expect(result?.projects).toHaveLength(1);
        expect(result?.projects[0].trainingAssignments[0].trainer).toMatchObject({
          name: 'Trainer One',
        });
        expect(prismaService.candidateProjects.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              candidateId,
              subStatus: {
                name: { in: expect.arrayContaining(['screening_assigned', 'training_completed']) },
              },
            }),
          }),
        );
      });
    });
  });

  describe('professionTypeId', () => {
    it('should reject invalid profession type on create', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        name: 'Recruiter',
        email: 'r@test.com',
        userRoles: [{ role: { name: 'Recruiter' } }],
      });
      prismaService.professionType.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          {
            firstName: 'John',
            lastName: 'Doe',
            countryCode: '+91',
            mobileNumber: '9999999999',
            source: 'manual',
            professionTypeId: 'invalid-profession-type',
          } as CreateCandidateDto,
          'user-1',
        ),
      ).rejects.toThrow(
        new BadRequestException('Invalid profession type'),
      );
    });

    it('should reject invalid profession type on update', async () => {
      prismaService.candidate.findUnique.mockResolvedValue({
        id: 'candidate123',
        countryCode: '+1',
        mobileNumber: '234567890',
      } as any);
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user123',
        userRoles: [{ role: { name: 'recruiter' } }],
      } as any);
      prismaService.professionType.findFirst.mockResolvedValue(null);

      await expect(
        service.update(
          'candidate123',
          { professionTypeId: 'invalid-profession-type' } as UpdateCandidateDto,
          'user123',
        ),
      ).rejects.toThrow(
        new BadRequestException('Invalid profession type'),
      );
    });
  });

  describe('preferredRoles', () => {
    it('should reject invalid preferred role catalog ids on update', async () => {
      prismaService.candidate.findUnique.mockResolvedValue({
        id: 'candidate123',
        countryCode: '+1',
        mobileNumber: '234567890',
      } as any);
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user123',
        userRoles: [{ role: { name: 'recruiter' } }],
      } as any);
      prismaService.roleCatalog.findMany.mockResolvedValue([
        { id: 'valid-role-id' },
      ]);

      await expect(
        service.update(
          'candidate123',
          { preferredRoles: ['valid-role-id', 'invalid-role-id'] } as UpdateCandidateDto,
          'user123',
        ),
      ).rejects.toThrow(
        new BadRequestException(
          'One or more preferred roles are invalid or inactive',
        ),
      );
    });
  });

  describe('findOne', () => {
    const mockCandidate = {
      id: 'candidate123',
      firstName: 'John',
      lastName: 'Doe',
      countryCode: '+1',
      mobileNumber: '234567890',
      email: 'john.doe@example.com',
      recruiterAssignments: [],
      team: { id: 'team123', name: 'Test Team' },
    };

    it('should return a candidate by id', async () => {
      prismaService.candidate.findUnique.mockResolvedValue(
        mockCandidate as any,
      );
      prismaService.candidateProjects.findMany.mockResolvedValue([]);

      const result = await service.findOne('candidate123');

      expect(result).toMatchObject(mockCandidate);
      expect(result).not.toHaveProperty('documents');
      expect(result).toHaveProperty('careerGapAnalysis');
      expect(prismaService.candidate.findUnique).toHaveBeenCalledWith({
        where: { id: 'candidate123' },
        include: expect.any(Object),
      });
    });

    it('should omit documents from the response while still computing profile completion and passportNumber', async () => {
      prismaService.candidate.findUnique.mockResolvedValue({
        ...mockCandidate,
        passportNumber: null,
        workExperiences: [],
        qualifications: [],
      } as any);
      prismaService.candidateProjects.findMany.mockResolvedValue([]);
      prismaService.document.findMany.mockImplementation((args: {
        select?: { status?: boolean; docType?: boolean };
      }) => {
        if (args.select?.status) {
          return Promise.resolve([]);
        }
        if (args.select?.docType) {
          return Promise.resolve([
            { docType: 'passport', documentNumber: 'AB123456' },
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await service.findOne('candidate123');

      expect(result).not.toHaveProperty('documents');
      expect(result.passportNumber).toBe('AB123456');
      expect((result as { profileCompletion?: unknown }).profileCompletion).toBeDefined();
      expect(prismaService.document.findMany).toHaveBeenCalledWith({
        where: { candidateId: 'candidate123', isDeleted: false },
        select: { docType: true, documentNumber: true },
      });
    });

    it('should include careerGapAnalysis computed from work history', async () => {
      const candidateWithJobs = {
        ...mockCandidate,
        workExperiences: [
          {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2025-01-01'),
            isCurrent: false,
            companyName: 'Aster Hospital',
            jobTitle: 'Nurse',
          },
          {
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-12-31'),
            isCurrent: false,
            companyName: 'City Clinic',
            jobTitle: 'Nurse',
          },
        ],
        qualifications: [
          {
            graduationYear: 2023,
            isCompleted: true,
            qualification: { name: 'MSc Nursing' },
          },
        ],
        documents: [],
      };

      prismaService.candidate.findUnique.mockResolvedValue(
        candidateWithJobs as any,
      );
      prismaService.candidateProjects.findMany.mockResolvedValue([]);

      const result = await service.findOne('candidate123');

      expect(result.careerGapAnalysis).toBeDefined();
      expect(result.careerGapAnalysis?.gaps.some((g) => g.type === 'between_jobs')).toBe(true);
      expect(result.careerGapAnalysis?.gaps.some((g) => g.type === 'education_to_work')).toBe(false);
    });

    it('should throw NotFoundException when candidate does not exist', async () => {
      prismaService.candidate.findUnique.mockResolvedValue(null);

      await expect(service.findOne('candidate123')).rejects.toThrow(
        new NotFoundException('Candidate with ID candidate123 not found'),
      );
    });
  });

  describe.skip('update', () => {
    const updateCandidateDto = {
      name: 'Jane Doe',
      currentStatus: 'shortlisted',
    } as unknown as UpdateCandidateDto;

    const mockCandidate = {
      id: 'candidate123',
      name: 'Jane Doe',
      currentStatus: 'shortlisted',
      recruiter: { id: 'user123', name: 'Test User' },
      team: { id: 'team123', name: 'Test Team' },
    };

    it('should update a candidate successfully', async () => {
      prismaService.candidate.findUnique.mockResolvedValue({
        id: 'candidate123',
        contact: '+1234567890',
      } as any);
      prismaService.candidate.update.mockResolvedValue(mockCandidate as any);

      const result = await service.update(
        'candidate123',
        updateCandidateDto,
        'user123',
      );

      expect(result).toEqual(mockCandidate);
      expect(prismaService.candidate.update).toHaveBeenCalledWith({
        where: { id: 'candidate123' },
        data: {
          name: 'Jane Doe',
          currentStatus: 'shortlisted',
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when candidate does not exist', async () => {
      prismaService.candidate.findUnique.mockResolvedValue(null);

      await expect(
        service.update('candidate123', updateCandidateDto, 'user123'),
      ).rejects.toThrow(
        new NotFoundException('Candidate with ID candidate123 not found'),
      );
    });

    it('should throw ConflictException when contact already exists', async () => {
      prismaService.candidate.findUnique
        .mockResolvedValueOnce({
          id: 'candidate123',
          contact: '+1234567890',
        } as any)
        .mockResolvedValueOnce({ id: 'existing123' } as any);

      const updateWithContact = {
        ...updateCandidateDto,
        contact: '+9876543210',
      };

      await expect(
        service.update('candidate123', updateWithContact, 'user123'),
      ).rejects.toThrow(
        new ConflictException(
          'Candidate with contact +9876543210 already exists',
        ),
      );
    });
  });

  describe('remove', () => {
    it('should delete a candidate successfully', async () => {
      prismaService.candidate.findUnique.mockResolvedValue({
        id: 'candidate123',
        firstName: 'John',
        lastName: 'Doe',
        projects: [],
      } as any);
      prismaService.candidate.delete.mockResolvedValue({
        id: 'candidate123',
      } as any);

      const result = await service.remove('candidate123', 'user123');

      expect(result).toEqual({
        id: 'candidate123',
        message: 'Candidate deleted successfully',
      });
    });

    it('should throw NotFoundException when candidate does not exist', async () => {
      prismaService.candidate.findUnique.mockResolvedValue(null);

      await expect(service.remove('candidate123', 'user123')).rejects.toThrow(
        new NotFoundException('Candidate with ID candidate123 not found'),
      );
    });

    it('should throw ConflictException when candidate has project assignments', async () => {
      prismaService.candidate.findUnique.mockResolvedValue({
        id: 'candidate123',
        projects: [{ id: 'assignment123' }],
      } as any);

      await expect(service.remove('candidate123', 'user123')).rejects.toThrow(
        new ConflictException(
          'Cannot delete candidate with ID candidate123 because they have project assignments. Please remove all project assignments first.',
        ),
      );
    });
  });

  describe('assignProject', () => {
    const assignProjectDto: AssignProjectDto = {
      projectId: 'project123',
      notes: 'Test assignment',
    };

    let getNextSpy: any;

    beforeEach(() => {
      getNextSpy = jest
        .spyOn(RoundRobinService.prototype, 'getNextRecruiter')
        .mockResolvedValue({
          id: 'recruiter1',
          name: 'Recruiter One',
          email: 'r1@test.com',
          workload: 0,
        } as any);
    });

    afterEach(() => {
      getNextSpy.mockRestore();
    });

    it('should assign candidate to project successfully', async () => {
      prismaService.candidate.findUnique.mockResolvedValue({
        id: 'candidate123',
      } as any);
      prismaService.project.findUnique.mockImplementation((args: any) => {
        if (args?.include?.team) {
          return Promise.resolve({
            id: 'project123',
            team: {
              userTeams: [
                {
                  user: {
                    id: 'recruiter1',
                    name: 'Recruiter One',
                    email: 'r1@test.com',
                    userRoles: [{ role: { name: 'Recruiter' } }],
                  },
                },
              ],
            },
          } as any);
        }
        return Promise.resolve({ id: 'project123' } as any);
      });
      prismaService.candidateProjects.findFirst.mockResolvedValue(null);
      prismaService.candidateProjects.count.mockResolvedValue(0);
      prismaService.candidateProjects.create.mockResolvedValue({
        id: 'assignment123',
        candidateId: 'candidate123',
        projectId: 'project123',
        notes: 'Test assignment',
      } as any);

      const result = await service.assignProject(
        'candidate123',
        assignProjectDto,
        'user123',
      );

      expect(result.message).toBe('Candidate assigned to project successfully');
      expect(prismaService.candidateProjects.create).toHaveBeenCalledWith({
        data: {
          candidateId: 'candidate123',
          projectId: 'project123',
          notes: 'Test assignment',
          currentProjectStatusId: 1,
          recruiterId: 'recruiter1',
          assignedAt: expect.any(Date),
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when candidate does not exist', async () => {
      prismaService.candidate.findUnique.mockResolvedValue(null);

      await expect(
        service.assignProject('candidate123', assignProjectDto, 'user123'),
      ).rejects.toThrow(
        new NotFoundException('Candidate with ID candidate123 not found'),
      );
    });

    it('should throw NotFoundException when project does not exist', async () => {
      prismaService.candidate.findUnique.mockResolvedValue({
        id: 'candidate123',
      } as any);
      prismaService.project.findUnique.mockResolvedValue(null);

      await expect(
        service.assignProject('candidate123', assignProjectDto, 'user123'),
      ).rejects.toThrow(
        new NotFoundException('Project with ID project123 not found'),
      );
    });

    it('should throw ConflictException when assignment already exists', async () => {
      prismaService.candidate.findUnique.mockResolvedValue({
        id: 'candidate123',
      } as any);
      prismaService.project.findUnique.mockResolvedValue({
        id: 'project123',
      } as any);
      prismaService.candidateProjects.findFirst.mockResolvedValue({
        id: 'existing123',
      } as any);

      await expect(
        service.assignProject('candidate123', assignProjectDto, 'user123'),
      ).rejects.toThrow(
        new ConflictException(
          'Candidate candidate123 is already assigned to project project123',
        ),
      );
    });
  });

  describe('getCandidateProjects', () => {
    const mockAssignments = [
      {
        id: 'assignment123',
        project: {
          id: 'project123',
          title: 'Test Project',
          status: 'active',
          client: {
            id: 'client123',
            name: 'Test Client',
            type: 'DIRECT_CLIENT',
          },
          team: { id: 'team123', name: 'Test Team' },
        },
        assignedDate: new Date(),
        verified: false,
        shortlisted: false,
        selected: false,
        notes: 'Test assignment',
      },
    ];

    it('should return candidate projects', async () => {
      prismaService.candidate.findUnique.mockResolvedValue({
        id: 'candidate123',
      } as any);
      prismaService.candidateProjects.findMany.mockResolvedValue(
        mockAssignments as any,
      );

      const result = await service.getCandidateProjects('candidate123');

      expect(result).toEqual(mockAssignments);
      expect(prismaService.candidateProjects.findMany).toHaveBeenCalledWith({
        where: { candidateId: 'candidate123' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw NotFoundException when candidate does not exist', async () => {
      prismaService.candidate.findUnique.mockResolvedValue(null);

      await expect(
        service.getCandidateProjects('candidate123'),
      ).rejects.toThrow(
        new NotFoundException('Candidate with ID candidate123 not found'),
      );
    });
  });

  describe('getCandidateStats', () => {
    it('should return candidate statistics', async () => {
      prismaService.candidate.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(50) // new
        .mockResolvedValueOnce(30) // shortlisted
        .mockResolvedValueOnce(20) // selected
        .mockResolvedValueOnce(30) // rejected
        .mockResolvedValueOnce(20); // hired

      prismaService.candidate.groupBy
        .mockResolvedValueOnce([
          { source: 'manual', _count: { source: 60 } },
          { source: 'meta', _count: { source: 30 } },
          { source: 'referral', _count: { source: 10 } },
        ] as any)
        .mockResolvedValueOnce([
          { teamId: 'team123', _count: { teamId: 50 } },
          { teamId: null, _count: { teamId: 50 } },
        ] as any);

      prismaService.candidate.aggregate.mockResolvedValue({
        _avg: { experience: 5.2, expectedMinSalary: 45000 },
      } as any);

      const result = await service.getCandidateStats();

      expect(result).toEqual({
        totalCandidates: 100,
        newCandidates: 50,
        shortlistedCandidates: 30,
        selectedCandidates: 20,
        rejectedCandidates: 30,
        hiredCandidates: 20,
        candidatesByStatus: {
          new: 50,
          shortlisted: 30,
          selected: 20,
          rejected: 30,
          hired: 20,
        },
        candidatesBySource: {
          manual: 60,
          meta: 30,
          referral: 10,
          direct_application: 0,
          direct_enquiry: 0,
          internal: 0,
          job_board: 0,
          paid_ads: 0,
          social_media: 0,
          agents: 0,
          hospital_visit: 0,
          expo_event: 0,
        },
        candidatesByTeam: {
          team123: 50,
          unassigned: 50,
        },
        averageExperience: 5.2,
        averageExpectedSalary: 45000,
      });
    });
  });
});
