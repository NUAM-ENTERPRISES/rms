import { Test, TestingModule } from '@nestjs/testing';
import { RecruiterAssignmentService } from '../recruiter-assignment.service';
import { PrismaService } from '../../../database/prisma.service';
import { OutboxService } from '../../../notifications/outbox.service';
import { RolesService } from '../../../roles/roles.service';
import { ROLE_NAMES } from '../../../common/constants/role-ids';

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
    userRoles: [{ roleId: 'role-cc', role: { name: 'Client Coordinator' } }],
  };

  const recruiterUser = {
    id: 'user-rec',
    name: 'Recruiter Ron',
    email: 'rec@test.com',
    mobileNumber: '9876543211',
    countryCode: '+91',
    userRoles: [{ roleId: recruiterRoleId, role: { name: 'Recruiter' } }],
  };

  describe('getBestRecruiterForAssignment', () => {
    it('assigns directly to creator when creator is Recruiter', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(recruiterUser);

      const result = await service.getBestRecruiterForAssignment(
        'cand-1',
        'user-rec',
      );

      expect(result.isRoundRobin).toBe(false);
      expect(result.directAssignmentKind).toBe('recruiter');
      expect(result.id).toBe('user-rec');
      expect(mockPrismaService.candidate.findUnique).not.toHaveBeenCalled();
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
});
