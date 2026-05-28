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
import { WhatsAppService } from '../../notifications/whatsapp.service';
import { WhatsAppNotificationService } from '../../notifications/whatsapp-notification.service';
import { CandidateCodeService } from '../services/candidate-code.service';

describe('CandidatesService', () => {
  let service: CandidatesService;
  let prismaService: any;

  const mockPrismaService: any = {
    $transaction: jest.fn(),
    candidate: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    candidateStatus: {
      findUnique: jest.fn(),
    },
    candidateStatusHistory: {
      create: jest.fn(),
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
    agent: {
      findUnique: jest.fn(),
    },
    candidateProjects: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    candidateRecruiterAssignment: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    country: {
      findUnique: jest.fn(),
    },
    state: {
      findUnique: jest.fn(),
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
  const mockWhatsAppService = {};
  const mockWhatsAppNotificationService = {};
  const mockCandidateCodeService: any = {
    reserveNextCode: jest.fn(),
  };

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
        { provide: RnrRemindersService, useValue: mockRnrRemindersService },
        { provide: WhatsAppService, useValue: mockWhatsAppService },
        {
          provide: WhatsAppNotificationService,
          useValue: mockWhatsAppNotificationService,
        },
      ],
    }).compile();

    service = module.get<CandidatesService>(CandidatesService);
    prismaService = module.get(PrismaService);
    prismaService.candidateRecruiterAssignment.findFirst.mockResolvedValue(null);
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

      const result = await service.findOne('candidate123');

      expect(result).toMatchObject(mockCandidate);
      expect(result).toHaveProperty('careerGapAnalysis');
      expect(prismaService.candidate.findUnique).toHaveBeenCalledWith({
        where: { id: 'candidate123' },
        include: expect.any(Object),
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
