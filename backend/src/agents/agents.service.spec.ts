import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { PrismaService } from '../database/prisma.service';

describe('AgentsService', () => {
  let service: AgentsService;

  const prisma = {
    agent: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    candidate: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    candidateProjectStatusHistory: {
      findMany: jest.fn(),
    },
    agentProject: {
      findMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      update: jest.fn(),
    },
    project: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(AgentsService);
  });

  describe('create', () => {
    it('creates agent without project links', async () => {
      const created = { id: 'agent-new', name: 'Partner Co' };
      prisma.$transaction.mockImplementation(async (fn: (t: unknown) => Promise<unknown>) =>
        fn({
          agent: {
            create: jest.fn().mockResolvedValue(created),
          },
          project: { findMany: jest.fn() },
          agentProject: { upsert: jest.fn() },
        }),
      );

      const res = await service.create({
        name: 'Partner Co',
        email: 'a@b.com',
      });

      expect(res.success).toBe(true);
      expect(res.data).toEqual(created);
    });

    it('creates agent and links projects in one transaction', async () => {
      const created = { id: 'agent-new', name: 'Partner Co' };
      const txAgentCreate = jest.fn().mockResolvedValue(created);
      const txProjectFindMany = jest.fn().mockResolvedValue([{ id: 'p1' }]);
      const txUpsert = jest.fn().mockResolvedValue({});

      prisma.$transaction.mockImplementation(async (fn: (t: unknown) => Promise<unknown>) =>
        fn({
          agent: { create: txAgentCreate },
          project: { findMany: txProjectFindMany },
          agentProject: { upsert: txUpsert },
        }),
      );

      await service.create({
        name: 'Partner Co',
        projectLinks: [{ projectId: 'p1', notes: 'Scope A' }],
      });

      expect(txAgentCreate).toHaveBeenCalled();
      expect(txProjectFindMany).toHaveBeenCalled();
      expect(txUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { agentId_projectId: { agentId: 'agent-new', projectId: 'p1' } },
          create: expect.objectContaining({
            notes: 'Scope A',
            isActive: true,
          }),
        }),
      );
    });

    it('throws when project link id is invalid', async () => {
      const created = { id: 'agent-new', name: 'Partner Co' };
      prisma.$transaction.mockImplementation(async (fn: (t: unknown) => Promise<unknown>) =>
        fn({
          agent: { create: jest.fn().mockResolvedValue(created) },
          project: { findMany: jest.fn().mockResolvedValue([]) },
          agentProject: { upsert: jest.fn() },
        }),
      );

      await expect(
        service.create({
          name: 'Partner Co',
          projectLinks: [{ projectId: 'missing' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('returns agent without embedding interview passed count', async () => {
      prisma.agent.findUnique.mockResolvedValue({
        id: 'a1',
        name: 'Agent One',
        _count: { candidates: 5, agentProjects: 2 },
        country: null,
      });

      const res = await service.findOne('a1');

      expect(res.success).toBe(true);
      expect(res.data._count.candidates).toBe(5);
      expect(prisma.candidate.count).not.toHaveBeenCalled();
    });

    it('throws when agent missing', async () => {
      prisma.agent.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAgentCandidateStats', () => {
    it('returns candidate stats from history-based interview passed count', async () => {
      prisma.agent.findUnique.mockResolvedValue({ id: 'a1' });
      prisma.candidate.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(4);
      prisma.agentProject.count.mockResolvedValue(2);

      const res = await service.getAgentCandidateStats('a1');

      expect(res.data).toEqual({
        totalCandidates: 10,
        interviewPassedCandidates: 4,
        linkedProjects: 2,
      });
      expect(prisma.candidate.count).toHaveBeenNthCalledWith(2, {
        where: {
          agentId: 'a1',
          projects: {
            some: {
              projectStatusHistory: {
                some: {
                  OR: [
                    { subStatus: { name: 'interview_passed' } },
                    {
                      subStatusSnapshot: {
                        equals: 'interview_passed',
                        mode: 'insensitive',
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      });
    });
  });

  describe('getAgentInterviewPassedCandidates', () => {
    it('applies history-based filter and attaches passed projects', async () => {
      prisma.agent.findUnique.mockResolvedValue({ id: 'a1' });
      prisma.candidate.count.mockResolvedValue(1);
      prisma.candidate.findMany.mockResolvedValue([
        {
          id: 'c1',
          firstName: 'Jane',
          lastName: 'Doe',
          countryCode: '+91',
          mobileNumber: '999',
          passportNumber: null,
          email: null,
          profileImage: null,
          createdAt: new Date(),
          currentStatus: null,
          agentCandidateDeclaredProjects: [],
          recruiterAssignments: [],
        },
      ]);
      prisma.candidateProjectStatusHistory.findMany.mockResolvedValue([
        {
          statusChangedAt: new Date('2026-01-02'),
          candidateProjectMap: {
            candidateId: 'c1',
            projectId: 'p2',
            project: { title: 'Project B' },
          },
        },
        {
          statusChangedAt: new Date('2026-01-01'),
          candidateProjectMap: {
            candidateId: 'c1',
            projectId: 'p1',
            project: { title: 'Project A' },
          },
        },
      ]);

      const res = await service.getAgentInterviewPassedCandidates('a1', {
        page: 1,
        limit: 10,
      });

      expect(res.data).toHaveLength(1);
      expect(res.data[0].interviewPassedCount).toBe(2);
      expect(res.data[0].interviewPassedProjects).toEqual([
        {
          projectId: 'p2',
          projectTitle: 'Project B',
          passedAt: expect.any(String),
        },
        {
          projectId: 'p1',
          projectTitle: 'Project A',
          passedAt: expect.any(String),
        },
      ]);
    });
  });

  describe('getAgentCandidates', () => {
    it('throws when agent missing', async () => {
      prisma.agent.findUnique.mockResolvedValue(null);
      await expect(service.getAgentCandidates('missing', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAgentProjects', () => {
    it('throws when agent missing', async () => {
      prisma.agent.findUnique.mockResolvedValue(null);
      await expect(service.getAgentProjects('a1')).rejects.toThrow(NotFoundException);
    });

    it('returns rows with projects', async () => {
      prisma.agent.findUnique.mockResolvedValue({ id: 'a1' });
      prisma.agentProject.count.mockResolvedValue(1);
      prisma.agentProject.findMany.mockResolvedValue([
        {
          id: 'ap1',
          agentId: 'a1',
          projectId: 'p1',
          notes: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          project: {
            id: 'p1',
            title: 'Proj',
            status: 'active',
            client: { id: 'c1', name: 'Client', type: 'hospital' },
          },
        },
      ]);
      prisma.$transaction.mockImplementation((args: Promise<unknown>[]) =>
        Promise.all(args),
      );

      const res = await service.getAgentProjects('a1');
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(res.data[0].project.title).toBe('Proj');
      expect(res.meta.total).toBe(1);
      expect(res.meta.page).toBe(1);
      expect(res.meta.limit).toBe(50);
      expect(res.meta.totalPages).toBe(1);
    });

    it('filters by search via nested project/client predicates', async () => {
      prisma.agent.findUnique.mockResolvedValue({ id: 'a1' });
      prisma.agentProject.count.mockResolvedValue(0);
      prisma.agentProject.findMany.mockResolvedValue([]);
      prisma.$transaction.mockImplementation((args: unknown[]) =>
        Promise.all(args as Promise<unknown>[]),
      );

      await service.getAgentProjects('a1', {
        page: 1,
        limit: 10,
        search: 'Sunrise',
      });

      expect(prisma.agentProject.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          agentId: 'a1',
          project: {
            OR: [
              { title: { contains: 'Sunrise', mode: 'insensitive' } },
              {
                client: {
                  name: { contains: 'Sunrise', mode: 'insensitive' },
                },
              },
            ],
          },
        }),
      });
    });
  });

  describe('linkAgentProjects', () => {
    it('throws BadRequest when project id invalid', async () => {
      prisma.agent.findUnique.mockResolvedValue({ id: 'a1' });
      prisma.project.findMany.mockResolvedValue([]);

      await expect(
        service.linkAgentProjects('a1', {
          links: [{ projectId: 'missing' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('upserts each link in a transaction', async () => {
      prisma.agent.findUnique.mockResolvedValue({ id: 'a1' });
      prisma.project.findMany.mockResolvedValue([{ id: 'p1' }]);

      prisma.$transaction
        .mockImplementationOnce((arg: unknown) => {
          const ops = arg as Promise<unknown>[];
          return Promise.all(ops);
        })
        .mockImplementationOnce((arg: unknown) => {
          const ops = arg as Promise<unknown>[];
          return Promise.all(ops);
        });

      await service.linkAgentProjects('a1', {
        links: [{ projectId: 'p1', notes: 'n' }],
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.agentProject.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { agentId_projectId: { agentId: 'a1', projectId: 'p1' } },
        }),
      );
    });
  });
});
