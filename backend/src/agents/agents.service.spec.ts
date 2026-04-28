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
    agentProject: {
      findMany: jest.fn(),
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

  describe('getAgentProjects', () => {
    it('throws when agent missing', async () => {
      prisma.agent.findUnique.mockResolvedValue(null);
      await expect(service.getAgentProjects('a1')).rejects.toThrow(NotFoundException);
    });

    it('returns rows with projects', async () => {
      prisma.agent.findUnique.mockResolvedValue({ id: 'a1' });
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

      const res = await service.getAgentProjects('a1');
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(res.data[0].project.title).toBe('Proj');
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
      prisma.$transaction.mockImplementation(async (ops: Promise<unknown>[]) =>
        Promise.all(ops),
      );
      prisma.agentProject.upsert.mockResolvedValue({});

      prisma.agentProject.findMany.mockResolvedValue([]);

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
